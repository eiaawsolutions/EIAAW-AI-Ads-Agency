import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ArrowRight, Mail } from "lucide-react";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { LogoWordmark } from "@/components/brand/logo";

export const metadata = { title: "Welcome — finish setup" };
export const dynamic = "force-dynamic";

/**
 * Post-checkout success page.
 *
 * Stripe redirects here after a successful Checkout Session with
 * ?session_id=cs_...  We:
 *   1. Verify the session with Stripe (rejects spoofed session IDs)
 *   2. Confirm the webhook has provisioned the User row (race-tolerant —
 *      poll up to 5s in case Stripe's redirect arrives before the
 *      webhook fires)
 *   3. Show the user exactly what happened (plan, trial end, email)
 *      and the single next action: sign in with Google
 *
 * Why a separate page from /dashboard: the user has no session yet
 * (Stripe Checkout doesn't sign them into our app). Sending them
 * straight to /dashboard hits the auth guard and silently bounces them
 * to /signin with no context. This page makes the "you paid, now sign
 * in" handoff explicit.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  if (!sessionId) redirect("/pricing");

  if (!stripe) {
    return <ErrorState reason="Stripe is not configured. Please contact support." />;
  }

  // Verify the session with Stripe — rejects spoofed/expired session IDs.
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "total_details.breakdown.discounts"],
  });

  if (session.status !== "complete") {
    return <ErrorState reason="Checkout did not complete. Please try again from the pricing page." />;
  }

  const email = (session.customer_details?.email ?? session.metadata?.email ?? "")
    .toString()
    .toLowerCase();
  const planLabel = session.metadata?.plan === "GROWTH" ? "Growth" : session.metadata?.plan === "ENTERPRISE" ? "Enterprise" : "Starter";

  // Poll for the User row — webhook usually fires within 1-2s but the
  // redirect can race ahead of it.
  const user = await waitForUser(email);
  const provisioned = !!user;

  // Subscription details (from the verified Stripe object, not our DB —
  // even if webhook hasn't landed, we can still show accurate info).
  const sub = typeof session.subscription === "object" ? session.subscription : null;
  const trialEnd = sub?.trial_end ? new Date(sub.trial_end * 1000) : null;
  const discountAmount = session.total_details?.amount_discount ?? 0;
  const hasDiscount = discountAmount > 0;
  const discountLabel = hasDiscount
    ? formatMoney(discountAmount, session.currency ?? "usd")
    : null;
  const discountName =
    session.total_details?.breakdown?.discounts?.[0]?.discount?.coupon?.name ??
    session.total_details?.breakdown?.discounts?.[0]?.discount?.coupon?.id ??
    null;

  return (
    <main className="min-h-screen bg-dawn grid place-items-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="w-full max-w-md relative">
        <Link href="/" className="inline-flex mb-10">
          <LogoWordmark />
        </Link>

        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/5 mb-6">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>

        <span className="eyebrow">Payment confirmed</span>
        <h1 className="mt-3 display text-3xl text-foreground">
          You&apos;re in.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Your {planLabel} workspace is ready. One last step: sign in with the same email so we can hand you the keys.
        </p>

        <div className="mt-8 rounded-lg border border-border bg-card overflow-hidden">
          <Row label="Email" value={email || "—"} mono />
          <Row label="Plan" value={planLabel} />
          {hasDiscount && (
            <Row
              label="Discount"
              value={`${discountName ? `${discountName} · ` : ""}-${discountLabel}`}
              tone="success"
            />
          )}
          <Row
            label="Trial ends"
            value={trialEnd ? trialEnd.toLocaleDateString(undefined, { dateStyle: "long" }) : "14 days from today"}
          />
          <Row
            label="Workspace"
            value={provisioned ? "Provisioned" : "Provisioning…"}
            tone={provisioned ? "success" : "muted"}
          />
        </div>

        {!provisioned && (
          <p className="mt-3 text-2xs text-muted-foreground text-center">
            Workspace is finalising — should be ready by the time you sign in.
          </p>
        )}

        <Button asChild variant="secondary" size="lg" className="mt-8 w-full">
          <a href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent("/dashboard?welcome=1")}`}>
            <Mail className="h-4 w-4" />
            Continue with Google · {email}
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>

        <p className="mt-4 text-2xs text-muted-foreground text-center">
          Sign in with the same Google account as <span className="mono text-foreground/80">{email || "your purchase email"}</span>.
          A receipt has been sent there.
        </p>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "success" | "muted";
  mono?: boolean;
}) {
  const valueClass =
    tone === "success" ? "text-primary" : tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="grid grid-cols-[110px_1fr] items-center px-4 py-3 hairline-b last:border-b-0">
      <span className="eyebrow">{label}</span>
      <span className={`text-sm ${mono ? "mono" : ""} ${valueClass}`}>{value}</span>
    </div>
  );
}

function ErrorState({ reason }: { reason: string }) {
  return (
    <main className="min-h-screen bg-dawn grid place-items-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex mb-10">
          <LogoWordmark />
        </Link>
        <span className="eyebrow">Something went wrong</span>
        <h1 className="mt-3 display text-3xl text-foreground">Checkout incomplete.</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{reason}</p>
        <Button asChild variant="secondary" size="lg" className="mt-8">
          <Link href="/pricing">Back to pricing</Link>
        </Button>
      </div>
    </main>
  );
}

async function waitForUser(email: string): Promise<{ id: string } | null> {
  if (!email) return null;
  const deadline = Date.now() + 5000;
  // Poll every 500ms for up to 5s while the webhook catches up. In the
  // common case this returns on the first attempt (webhook fires in
  // <500ms), so we don't pay any latency cost when things are healthy.
  while (Date.now() < deadline) {
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (user) return user;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

function formatMoney(minor: number, currency: string): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: major < 1 ? 2 : 0,
    }).format(major);
  } catch {
    return `${currency.toUpperCase()} ${major.toFixed(2)}`;
  }
}
