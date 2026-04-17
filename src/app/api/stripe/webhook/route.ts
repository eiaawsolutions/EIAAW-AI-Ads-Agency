import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${err instanceof Error ? err.message : String(err)}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      // TODO: link Stripe customer to org, create Subscription row.
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // TODO: sync status + currentPeriodEnd to Subscription.
      break;
    }
  }

  await db.auditLog.create({
    data: { orgId: "system", actorId: null, action: `stripe.${event.type}`, meta: { id: event.id } },
  }).catch(() => null);

  return NextResponse.json({ received: true });
}
