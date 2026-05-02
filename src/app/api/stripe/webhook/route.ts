import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Plan, Role, SubscriptionStatus } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

/**
 * POST /api/stripe/webhook
 *
 * The ONLY path that creates User + Organization + Membership +
 * Subscription + Brand rows. The strict-checkout invariant: nobody enters
 * the system without a Stripe-validated checkout completion.
 *
 * Signature verification is mandatory. Refusing to verify when the secret
 * is unset is the only safe default — see SMT billing.js:512 for the same
 * threat model (unauthenticated synthetic events would let anyone create
 * an account with any email).
 *
 * Events handled:
 *   - checkout.session.completed         → upsert account + start trial
 *   - customer.subscription.created      → idempotent backfill (rare race)
 *   - customer.subscription.updated      → sync status + currentPeriodEnd
 *   - customer.subscription.deleted      → status=CANCELED
 *   - invoice.payment_succeeded          → status=ACTIVE (ends trial / renews)
 *   - invoice.payment_failed             → status=PAST_DUE
 */

// Stripe needs the raw body for signature verification. Next.js's app
// router gives us that via req.text() — DO NOT JSON.parse before verifying.
export async function POST(req: Request) {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe.webhook] STRIPE_WEBHOOK_SECRET not set — refusing all events");
    return NextResponse.json({ error: "webhook signing secret not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing stripe-signature header" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe.webhook] signature verification failed:", msg);
    return NextResponse.json({ error: "invalid webhook signature" }, { status: 401 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await onSubscriptionUpserted(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_succeeded":
        await onInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await onInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        // Ignore unhandled events — Stripe will retry if we 5xx, so 200 is safer.
        break;
    }

    await db.auditLog
      .create({
        data: {
          orgId: "system",
          actorId: null,
          action: `stripe.${event.type}`,
          meta: { id: event.id, livemode: event.livemode },
        },
      })
      .catch(() => null);

    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[stripe.webhook] handler for ${event.type} failed:`, msg);
    // 500 → Stripe will retry. Idempotent handlers can absorb that.
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * The account-creation event. Pulls plan + email from session.metadata
 * (set by /api/stripe/checkout) and from session.customer_details.email
 * as a backup. Idempotent: re-firing the same event is safe.
 */
async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const email = (session.metadata?.email ?? session.customer_details?.email ?? "")
    .toString()
    .trim()
    .toLowerCase();
  if (!email) {
    console.error("[stripe.webhook] checkout.session.completed without email; session:", session.id);
    return;
  }

  const planKey = (session.metadata?.plan ?? "STARTER").toString().toUpperCase();
  const plan: Plan = planKey === "GROWTH" ? Plan.GROWTH : planKey === "ENTERPRISE" ? Plan.ENTERPRISE : Plan.STARTER;

  const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!stripeCustomerId || !stripeSubscriptionId) {
    console.error("[stripe.webhook] checkout.session.completed missing customer/subscription IDs; session:", session.id);
    return;
  }

  // Fetch the subscription so we have authoritative status + period end.
  if (!stripe) return;
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const status = mapStripeStatus(sub.status);
  const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

  // Atomic: User + Org + Membership + Subscription + Brand. If anything
  // mid-way fails, Stripe retries the webhook — so all upserts are by
  // unique key (email / orgId) and safe to repeat.
  await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {},
      create: { email, name: deriveDisplayName(email) },
    });

    // Find existing membership; if none, create org + membership.
    const existingMembership = await tx.membership.findFirst({
      where: { userId: user.id },
      include: { org: true },
    });

    let orgId: string;
    if (existingMembership) {
      orgId = existingMembership.orgId;
      // Bump plan if checkout was for a different tier.
      if (existingMembership.org.plan !== plan) {
        await tx.organization.update({ where: { id: orgId }, data: { plan } });
      }
    } else {
      const slug = await uniqueSlug(tx, deriveSlug(email));
      const org = await tx.organization.create({
        data: { slug, name: deriveDisplayName(email), plan },
      });
      orgId = org.id;
      await tx.membership.create({
        data: { userId: user.id, orgId, role: Role.OWNER },
      });
    }

    await tx.subscription.upsert({
      where: { orgId },
      update: { stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd },
      create: { orgId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd },
    });

    // Default brand if none exists for this org.
    const brandCount = await tx.brand.count({ where: { orgId } });
    if (brandCount === 0) {
      await tx.brand.create({ data: { orgId, name: deriveDisplayName(email) } });
    }
  });

  console.log(`[stripe.webhook] checkout.session.completed: provisioned ${email} on ${plan} (${status})`);
}

async function onSubscriptionUpserted(sub: Stripe.Subscription): Promise<void> {
  const status = mapStripeStatus(sub.status);
  const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
  const updated = await db.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: { status, currentPeriodEnd, cancelAtPeriodEnd: !!sub.cancel_at_period_end },
  });
  if (updated.count === 0) {
    console.log(`[stripe.webhook] subscription ${sub.id} not yet linked to an org — checkout webhook will arrive shortly`);
  }
}

async function onSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  await db.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: { status: SubscriptionStatus.CANCELED, cancelAtPeriodEnd: true },
  });
  console.log(`[stripe.webhook] subscription ${sub.id} CANCELED`);
}

async function onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subId) return;
  await db.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: SubscriptionStatus.ACTIVE },
  });
}

async function onInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subId) return;
  await db.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: SubscriptionStatus.PAST_DUE },
  });
}

function mapStripeStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
    case "unpaid":
      return SubscriptionStatus.CANCELED;
    case "incomplete":
    case "incomplete_expired":
      return SubscriptionStatus.INCOMPLETE;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

function deriveDisplayName(email: string): string {
  const local = email.split("@")[0] ?? "Workspace";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim() || "Workspace";
}

function deriveSlug(email: string): string {
  const base = email
    .split("@")[0]!
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || "workspace";
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
async function uniqueSlug(tx: Tx, base: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const taken = await tx.organization.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
