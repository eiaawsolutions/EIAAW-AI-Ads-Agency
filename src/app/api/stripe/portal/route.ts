import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/stripe/portal
 *
 * Create a Stripe Customer Portal session for the caller's primary org and
 * redirect them to it. The org must already have a `stripeCustomerId` from
 * a prior Checkout. Surfaced from the Settings page "Manage in Stripe".
 */
export async function GET() {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });

  const session = await auth();
  const userId = session?.user && "id" in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await db.membership.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (!m) return NextResponse.json({ error: "No org" }, { status: 400 });

  const sub = await db.subscription.findUnique({ where: { orgId: m.orgId } });
  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer on file" }, { status: 404 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/settings`,
  });

  return NextResponse.redirect(portal.url, 303);
}
