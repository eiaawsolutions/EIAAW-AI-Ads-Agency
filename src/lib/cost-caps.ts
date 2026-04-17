import { Plan } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Daily AI cost caps per subscription plan, in USD.
 * Forms the primary line of defense against a runaway agent flow
 * exhausting the Anthropic account. Caps are generous enough that
 * normal usage never trips them; abusive usage trips them fast.
 */
export const DAILY_CAP_USD: Record<Plan, number> = {
  STARTER: 5,       // ~1250 Haiku calls or ~60 Opus calls per day
  GROWTH: 25,       // covers typical active account's agent activity
  ENTERPRISE: 250,  // negotiable per-contract; high ceiling by default
};

export type CapCheck =
  | { ok: true; spentUsd: number; capUsd: number; remainingUsd: number }
  | { ok: false; spentUsd: number; capUsd: number; reason: string };

/**
 * Does this org have budget to make another agent call?
 * We don't know the exact cost of the pending call, so we reserve
 * an optimistic allowance (0.02 USD) before running, and rely on
 * the post-run accounting (real costUsd written to AgentRun) to
 * keep the running total honest.
 */
export async function checkDailyCap(orgId: string, optimisticUsd = 0.02): Promise<CapCheck> {
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!org) return { ok: false, spentUsd: 0, capUsd: 0, reason: "unknown org" };

  const cap = DAILY_CAP_USD[org.plan];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const agg = await db.agentRun.aggregate({
    where: { orgId, createdAt: { gte: startOfDay } },
    _sum: { costUsd: true },
  });
  const spent = agg._sum.costUsd ?? 0;

  if (spent + optimisticUsd > cap) {
    return {
      ok: false,
      spentUsd: spent,
      capUsd: cap,
      reason: `Daily AI cost cap exceeded: $${spent.toFixed(4)} / $${cap.toFixed(2)}`,
    };
  }

  return { ok: true, spentUsd: spent, capUsd: cap, remainingUsd: cap - spent };
}

/**
 * Owners can override the cap for emergencies via a shared secret
 * (rotated per environment). Intentionally rare; logs every use.
 */
export function isCapOverride(headerVal: string | null | undefined): boolean {
  if (!headerVal) return false;
  const expected = process.env.EIAAW_COST_OVERRIDE_SECRET;
  if (!expected || expected.length < 16) return false;
  return headerVal === expected;
}
