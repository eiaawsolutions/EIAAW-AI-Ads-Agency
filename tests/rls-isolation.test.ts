/**
 * Cross-tenant isolation test.
 *
 * Requires ENABLE_RLS=true + prisma/policies.sql applied to a real Postgres.
 * When DATABASE_URL is unavailable or RLS is off, the test suite is skipped —
 * we don't want CI to fail just because it's running against a fresh DB.
 *
 * Proves:
 *   - two orgs (alpha, beta) each have a Brand row
 *   - a transaction scoped to alpha sees only alpha's Brand
 *   - a transaction scoped to beta sees only beta's Brand
 *   - cross-tenant findUnique / updateMany / deleteMany all return zero rows
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { withRls } from "@/lib/tenant";

const db = new PrismaClient();
const canRun = !!process.env.DATABASE_URL && process.env.ENABLE_RLS === "true";
const SUITE = canRun ? describe : describe.skip;

SUITE("RLS — cross-tenant isolation (live DB)", () => {
  let alphaOrgId = "";
  let betaOrgId = "";
  let alphaBrandId = "";
  let betaBrandId = "";

  beforeAll(async () => {
    const tag = Math.random().toString(36).slice(2, 8);
    const alpha = await db.organization.create({
      data: { slug: `rls-alpha-${tag}`, name: "Alpha Test Org" },
    });
    const beta = await db.organization.create({
      data: { slug: `rls-beta-${tag}`, name: "Beta Test Org" },
    });
    alphaOrgId = alpha.id;
    betaOrgId = beta.id;

    const a = await db.brand.create({ data: { orgId: alpha.id, name: "Alpha Brand" } });
    const b = await db.brand.create({ data: { orgId: beta.id, name: "Beta Brand" } });
    alphaBrandId = a.id;
    betaBrandId = b.id;
  });

  afterAll(async () => {
    await db.brand.deleteMany({ where: { id: { in: [alphaBrandId, betaBrandId] } } });
    await db.organization.deleteMany({ where: { id: { in: [alphaOrgId, betaOrgId] } } });
    await db.$disconnect();
  });

  it("alpha sees only alpha brands", async () => {
    const rows = await withRls(alphaOrgId, (tx) => tx.brand.findMany({ where: {} }));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(alphaBrandId);
    expect(ids).not.toContain(betaBrandId);
  });

  it("beta sees only beta brands", async () => {
    const rows = await withRls(betaOrgId, (tx) => tx.brand.findMany({ where: {} }));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(betaBrandId);
    expect(ids).not.toContain(alphaBrandId);
  });

  it("tenant cannot IDOR a brand from another org", async () => {
    const leaked = await withRls(alphaOrgId, (tx) =>
      tx.brand.findUnique({ where: { id: betaBrandId } }),
    );
    expect(leaked).toBeNull();
  });

  it("tenant cannot update another org's brand", async () => {
    const res = await withRls(alphaOrgId, (tx) =>
      tx.brand.updateMany({ where: { id: betaBrandId }, data: { name: "HACKED" } }),
    );
    expect(res.count).toBe(0);
    const intact = await db.brand.findUnique({ where: { id: betaBrandId } });
    expect(intact?.name).toBe("Beta Brand");
  });

  it("tenant cannot delete another org's brand", async () => {
    const res = await withRls(alphaOrgId, (tx) =>
      tx.brand.deleteMany({ where: { id: betaBrandId } }),
    );
    expect(res.count).toBe(0);
    const stillThere = await db.brand.findUnique({ where: { id: betaBrandId } });
    expect(stillThere).not.toBeNull();
  });
});
