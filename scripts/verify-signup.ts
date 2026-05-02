/**
 * Quick post-signup audit. Run after a Stripe checkout completes:
 *   npx tsx scripts/verify-signup.ts <email>
 *
 * Reports User + Org + Membership + Subscription + Brand state for the
 * given email so we can confirm the webhook did all five upserts.
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = (process.argv[2] ?? "").toLowerCase();
  if (!email) {
    console.error("Usage: npx tsx scripts/verify-signup.ts <email>");
    process.exit(1);
  }

  const db = new PrismaClient();
  const user = await db.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          org: {
            include: {
              subscription: true,
              brands: true,
            },
          },
        },
      },
      accounts: { select: { provider: true } },
    },
  });

  if (!user) {
    console.log(`[verify] no User row found for ${email} — webhook may not have fired yet, or fired with a different email`);
    console.log(`[verify] try: SELECT * FROM "User" ORDER BY "createdAt" DESC LIMIT 5;`);
    await db.$disconnect();
    process.exit(2);
  }

  console.log("=== USER ===");
  console.log({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt });
  console.log("OAuth accounts linked:", user.accounts.map((a) => a.provider).join(", ") || "(none — sign in with Google to link)");

  for (const m of user.memberships) {
    console.log("\n=== ORG ===");
    console.log({ id: m.org.id, slug: m.org.slug, name: m.org.name, plan: m.org.plan });
    console.log("Membership role:", m.role);
    console.log("\n=== SUBSCRIPTION ===");
    if (m.org.subscription) {
      console.log({
        stripeCustomerId: m.org.subscription.stripeCustomerId,
        stripeSubscriptionId: m.org.subscription.stripeSubscriptionId,
        status: m.org.subscription.status,
        plan: m.org.subscription.plan,
        currentPeriodEnd: m.org.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: m.org.subscription.cancelAtPeriodEnd,
      });
    } else {
      console.log("(none — webhook missed the upsert; check stripe.checkout.session.completed log)");
    }
    console.log("\n=== BRANDS ===");
    for (const b of m.org.brands) {
      console.log({ id: b.id, name: b.name });
    }
  }

  console.log("\n[verify] done. If subscription.status is TRIALING and an org+brand exist, signup worked.");
  console.log("[verify] To sign in: visit https://ads.eiaawsolutions.com/signin and Continue with Google using the SAME email.");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
