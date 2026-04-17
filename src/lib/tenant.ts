import { db } from "./db";

/**
 * Tenant resolution helpers. Every request that touches org-scoped data
 * MUST go through `requireOrg` so downstream queries can be constrained.
 * When Postgres RLS is enabled, this also sets `app.current_org_id`.
 */

export type TenantContext = {
  orgId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "STRATEGIST" | "ANALYST" | "VIEWER";
};

export async function resolveTenant(userId: string, slug: string): Promise<TenantContext | null> {
  const membership = await db.membership.findFirst({
    where: { userId, org: { slug } },
    include: { org: true },
  });
  if (!membership) return null;
  return { orgId: membership.orgId, userId, role: membership.role };
}

export async function withRls<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  if (process.env.ENABLE_RLS !== "true") return fn();
  // Set the GUC for the current transaction. Requires policies.sql applied.
  await db.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${orgId.replace(/'/g, "''")}'`);
  return fn();
}
