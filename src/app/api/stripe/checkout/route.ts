import { NextResponse } from "next/server";
import { Plan } from "@prisma/client";
import { stripe, PRICE_IDS } from "@/lib/stripe";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/stripe/checkout
 *
 * Public signup entry point. Strict-checkout invariant: User + Organization +
 * Membership + Subscription + Brand are NOT created here. They are created
 * by the webhook handler when checkout.session.completed fires (after Stripe
 * has actually validated the card and started the trial).
 *
 * If a user with this email already has an active/trialing Subscription,
 * we reject — they should sign in instead. This prevents duplicate-org
 * abuse via repeat checkout attempts.
 *
 * Lazy-creates Stripe Products + Prices on first checkout per plan when
 * STRIPE_PRICE_* env vars are unset. Once created, the price IDs persist
 * in Stripe and the env vars should be populated for stable reuse.
 *
 * Pattern mirrors the working SMT (sales marketing agent) flow at
 * Sales marketing agent/src/routes/billing.js:311 (POST /checkout).
 */

const PLAN_CATALOG = {
  STARTER: {
    plan: Plan.STARTER,
    name: "Starter",
    priceUsd: 499,
    description: "SMEs spending up to $20k/mo · 3 platforms · 5 active campaigns · weekly AI reports",
  },
  GROWTH: {
    plan: Plan.GROWTH,
    name: "Growth",
    priceUsd: 1499,
    description: "Scaling brands up to $100k/mo · all 7 platforms · unlimited campaigns · A/B testing · creative gen · daily reports",
  },
} as const;

const TRIAL_DAYS = 14;

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Per-IP rate limit: 6 checkout attempts / hour blunts both signup-spam
  // and brute-force email-enumeration attempts via the duplicate check.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = await rateLimit(`checkout:${ip}`, { limit: 6, windowSec: 3600 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many signup attempts. Retry in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  // Reject if email already has an active/trialing subscription.
  const existing = await db.user.findUnique({
    where: { email: parsed.email },
    include: { memberships: { include: { org: { include: { subscription: true } } } } },
  });
  if (existing) {
    const hasActive = existing.memberships.some((m) =>
      m.org.subscription &&
      (m.org.subscription.status === "ACTIVE" || m.org.subscription.status === "TRIALING"),
    );
    if (hasActive) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 },
      );
    }
    // User exists but has no active sub (e.g., previous CANCELED) — allow
    // re-checkout. The webhook upserts on email so we won't dupe.
  }

  const catalog = PLAN_CATALOG[parsed.plan];
  let priceId: string;
  try {
    priceId = await resolvePriceId(parsed.plan, catalog);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe.checkout] price resolution failed:", message);
    return NextResponse.json({ error: "Pricing setup error — contact support." }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: parsed.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { plan: parsed.plan, email: parsed.email },
      },
      // Pass plan + email in session metadata as well so the webhook has
      // them on checkout.session.completed even before the subscription
      // object is fully expanded.
      metadata: { plan: parsed.plan, email: parsed.email },
      success_url: `${baseUrl}/dashboard?welcome=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?canceled=1`,
      allow_promotion_codes: true,
    });
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe.checkout] session.create failed:", message);
    return NextResponse.json({ error: "Failed to start checkout — try again." }, { status: 502 });
  }
}

type ParsedBody =
  | { plan: keyof typeof PLAN_CATALOG; email: string }
  | { error: string };

function parseBody(raw: unknown): ParsedBody {
  if (!raw || typeof raw !== "object") return { error: "body must be an object" };
  const b = raw as Record<string, unknown>;

  const plan = String(b.plan ?? "").toUpperCase();
  if (plan !== "STARTER" && plan !== "GROWTH") {
    return { error: "plan must be STARTER or GROWTH (Enterprise — contact sales)" };
  }

  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "valid email required" };
  }

  return { plan: plan as "STARTER" | "GROWTH", email };
}

/**
 * Resolves a Stripe price ID for the plan. Three-tier lookup matching the
 * SMT (Sales Marketing Agent) pattern at Sales marketing agent/src/routes/billing.js:325-345:
 *   1. DB Setting cache (key = `stripe_price_${plan}`) — survives restarts,
 *      no Infisical roundtrip, no Stripe API call
 *   2. STRIPE_PRICE_<PLAN> env var — for operators who pre-create prices
 *      in Stripe Dashboard and pin the IDs
 *   3. Lazy-create Product + recurring monthly Price in Stripe — first-
 *      run convenience; persist the new ID to the DB cache for next time
 *
 * Net effect: the app can sign up its first paying customer without ANY
 * pre-provisioned price IDs. Stripe creates them, we cache them, every
 * subsequent checkout uses the cached ID. This is exactly what makes the
 * SMT signup flow work without operator intervention.
 */
async function resolvePriceId(
  planKey: keyof typeof PLAN_CATALOG,
  catalog: (typeof PLAN_CATALOG)[keyof typeof PLAN_CATALOG],
): Promise<string> {
  const settingKey = `stripe_price_${planKey.toLowerCase()}`;

  // 1. DB cache
  const cached = await db.setting.findUnique({ where: { key: settingKey } });
  if (cached?.value && cached.value.startsWith("price_")) return cached.value;

  // 2. Env (operator-pinned)
  const fromEnv = PRICE_IDS[planKey];
  if (fromEnv && fromEnv.startsWith("price_")) {
    // Backfill the cache so the next checkout skips both DB miss + env read.
    await db.setting.upsert({
      where: { key: settingKey },
      update: { value: fromEnv },
      create: { key: settingKey, value: fromEnv },
    });
    return fromEnv;
  }

  // 3. Lazy-create in Stripe
  if (!stripe) throw new Error("stripe client unavailable");
  const product = await stripe.products.create({
    name: `EIAAW Ai Ads Agency — ${catalog.name}`,
    description: catalog.description,
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: catalog.priceUsd * 100,
    currency: "usd",
    recurring: { interval: "month" },
  });
  await db.setting.upsert({
    where: { key: settingKey },
    update: { value: price.id },
    create: { key: settingKey, value: price.id },
  });
  console.log(
    `[stripe.checkout] lazy-created + cached price for ${planKey}: ${price.id} (product ${product.id})`,
  );
  return price.id;
}
