import { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * Tenant resolution + RLS helpers.
 *
 *  - resolveTenant(userId, slug)  → TenantContext | null
 *  - withRls(orgId, work)         → Promise<T>
 *      Runs `work` inside a transaction with
 *      `SET LOCAL app.current_org_id = '<uuid>'` pre-set.
 *      RLS policies in prisma/policies.sql read this GUC.
 *      No-op when ENABLE_RLS != "true".
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

export async function withRls<T>(
  orgId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  // UUID defensive check — orgId goes into a SET LOCAL statement that
  // can't be parameterized, so we gate on a strict format.
  if (!/^[a-z0-9]{24,36}$/.test(orgId)) {
    throw new Error(`withRls: invalid orgId format`);
  }

  if (process.env.ENABLE_RLS !== "true") {
    return db.$transaction(async (tx) => work(tx));
  }

  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${orgId}'`);
    return work(tx);
  });
}
