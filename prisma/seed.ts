import { PrismaClient, Plan, Role } from "@prisma/client";

/**
 * Minimal seed: only the demo org/user/membership scaffold so the
 * unauthenticated agent handler and wizard polling have a tenant to
 * resolve to. Real brands, campaigns, ads, metrics, experiments, and
 * reports are created by the application — never seeded.
 */
const db = new PrismaClient();

async function main() {
  const org = await db.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { slug: "demo", name: "Demo", plan: Plan.STARTER },
  });

  const user = await db.user.upsert({
    where: { email: "demo@eiaaw.ai" },
    update: {},
    create: { email: "demo@eiaaw.ai", name: "Demo User" },
  });

  await db.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: {},
    create: { userId: user.id, orgId: org.id, role: Role.OWNER },
  });

  // eslint-disable-next-line no-console
  console.log("Seeded scaffold: org", org.slug, "user", user.email);
}

main().finally(() => db.$disconnect());
