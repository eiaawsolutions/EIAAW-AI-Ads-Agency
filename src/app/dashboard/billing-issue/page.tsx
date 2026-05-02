import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { LogoWordmark } from "@/components/brand/logo";

export const metadata = { title: "Billing issue" };
export const dynamic = "force-dynamic";

/**
 * Reached when a user's Subscription is PAST_DUE or INCOMPLETE — they
 * still have a session but the dashboard guard redirects here. We surface
 * the situation, offer the Stripe Customer Portal so they can update
 * payment method, and explain access is paused until billing is current.
 */
export default async function BillingIssuePage() {
  const session = await auth();
  const userId = session?.user && "id" in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) redirect("/signin");

  const membership = await db.membership.findFirst({
    where: { userId },
    include: { org: { include: { subscription: true } } },
  });
  if (!membership || !membership.org.subscription) redirect("/pricing");

  const sub = membership.org.subscription;
  // If billing has been resolved since the last redirect, send them on to dashboard.
  if (sub.status === "ACTIVE" || sub.status === "TRIALING") redirect("/dashboard");

  const reason =
    sub.status === "PAST_DUE"
      ? "Your last payment failed. Update your payment method in the Stripe portal to restore access."
      : sub.status === "INCOMPLETE"
        ? "Your initial payment did not complete. Finish the checkout in the Stripe portal to activate your trial."
        : sub.status === "CANCELED"
          ? "Your subscription was canceled. Start a new trial to regain access."
          : "Subscription needs attention.";

  return (
    <main className="min-h-screen bg-dawn grid place-items-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex mb-10">
          <LogoWordmark />
        </Link>
        <span className="eyebrow">Subscription · {sub.status}</span>
        <h1 className="mt-3 display text-3xl text-foreground">Billing needs attention.</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{reason}</p>

        <div className="mt-8 flex flex-col gap-2">
          <Button asChild variant="secondary" size="lg">
            <a href="/api/stripe/portal">Open Stripe portal</a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">Or start a new trial</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
