/**
 * Temporary reset — drops all RLS policies + FORCE so existing app code
 * (which doesn't yet wrap everything in withRls) keeps working.
 *
 * Run this if you've applied policies.sql prematurely. Once every code
 * path that touches org-scoped tables goes through withRls(orgId, ...),
 * re-run apply-rls.ts and set ENABLE_RLS=true.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const TABLES = [
  "Brand", "BrandDna", "Integration", "Campaign", "AdSet", "Ad",
  "MetricDaily", "AgentRun", "Experiment", "ExperimentVariant",
  "Report", "AuditLog", "Membership",
];

async function main() {
  for (const t of TABLES) {
    await db.$executeRawUnsafe(`ALTER TABLE "${t}" DISABLE ROW LEVEL SECURITY`);
    await db.$executeRawUnsafe(`ALTER TABLE "${t}" NO FORCE ROW LEVEL SECURITY`);
  }
  // eslint-disable-next-line no-console
  console.log(`OK — RLS disabled on ${TABLES.length} tables`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
