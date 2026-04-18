/**
 * Apply Postgres RLS policies to the linked database.
 * Reads prisma/policies.sql and executes it via Prisma's raw executor.
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/apply-rls.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const sql = readFileSync(join(__dirname, "..", "prisma", "policies.sql"), "utf8");
  // Split on `;` at statement boundaries, ignore empty/comment-only chunks.
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s && !/^--/.test(s) && !/^\s*BEGIN$/i.test(s) && !/^\s*COMMIT$/i.test(s));

  let ok = 0;
  for (const stmt of statements) {
    try {
      await db.$executeRawUnsafe(stmt);
      ok += 1;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("FAILED:\n", stmt.slice(0, 160), "\n→", err instanceof Error ? err.message : err);
      throw err;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`OK — ${ok} statements applied`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
