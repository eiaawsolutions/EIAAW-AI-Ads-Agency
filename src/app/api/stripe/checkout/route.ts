import { NextResponse } from "next/server";
import { stripe, PRICE_IDS } from "@/lib/stripe";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json();
  const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];
  if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: session.user.email ?? undefined,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?welcome=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=1`,
    subscription_data: { trial_period_days: 14 },
  });

  return NextResponse.json({ url: checkout.url });
}
