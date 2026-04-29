import { PrismaClient, Plan, Role, ExecutionMode } from "@prisma/client";

const EMAIL = process.env.CLIENT_EMAIL ?? "eiaawsolutions@gmail.com";
const ORG_SLUG = process.env.CLIENT_ORG_SLUG ?? "eiaaw-solutions";
const ORG_NAME = process.env.CLIENT_ORG_NAME ?? "EIAAW SOLUTIONS";
const ORG_PLAN: Plan = (process.env.CLIENT_ORG_PLAN as Plan) ?? Plan.GROWTH;
const USER_NAME = process.env.CLIENT_USER_NAME ?? "EIAAW Solutions";
const ROLE: Role = (process.env.CLIENT_ROLE as Role) ?? Role.OWNER;

async function main() {
  const db = new PrismaClient();
  try {
    const org = await db.organization.upsert({
      where: { slug: ORG_SLUG },
      update: { name: ORG_NAME, plan: ORG_PLAN },
      create: {
        slug: ORG_SLUG,
        name: ORG_NAME,
        plan: ORG_PLAN,
        executionMode: ExecutionMode.ASSISTED,
      },
    });

    const user = await db.user.upsert({
      where: { email: EMAIL },
      update: { name: USER_NAME },
      create: { email: EMAIL, name: USER_NAME },
    });

    const membership = await db.membership.upsert({
      where: { userId_orgId: { userId: user.id, orgId: org.id } },
      update: { role: ROLE },
      create: { userId: user.id, orgId: org.id, role: ROLE },
    });

    console.log(JSON.stringify({
      ok: true,
      user: { id: user.id, email: user.email },
      org: { id: org.id, slug: org.slug, name: org.name, plan: org.plan },
      membership: { role: membership.role },
      signinHint: `Sign in at /signin with email ${EMAIL} (Demo credentials provider) or Google OAuth using the same email.`,
    }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
