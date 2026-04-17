import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

export const stripe = key
  ? new Stripe(key, { typescript: true })
  : null;

export const PRICE_IDS = {
  STARTER: process.env.STRIPE_PRICE_STARTER,
  GROWTH: process.env.STRIPE_PRICE_GROWTH,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
} as const;
