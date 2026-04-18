import { NextResponse } from "next/server";
import { AgentKind } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DAILY_CAP_USD } from "@/lib/cost-caps";

/**
 * GET /api/admin/usage
 *
 * Returns today's AI cost posture for the caller's primary org:
 *   - spend today (USD)
 *   - cap today (USD)
 *   - remaining (USD)
 *   - per-agent breakdown
 *   - last 10 runs
 *
 * Useful immediately after activating ANTHROPIC_API_KEY to verify the
 * cost accounting matches reality. Also powers a future Settings widget.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const membership = await db.membership.findFirst({
    where: { userId },
    include: { org: { select: { id: true, name: true, plan: true } } },
  });
  if (!membership) return NextResponse.json({ error: "No org" }, { status: 400 });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [agg, perAgent, recent] = await Promise.all([
    db.agentRun.aggregate({
      where: { orgId: membership.orgId, createdAt: { gte: startOfDay } },
      _sum: { costUsd: true, tokensIn: true, tokensOut: true },
      _count: true,
    }),
    db.agentRun.groupBy({
      by: ["kind"],
      where: { orgId: membership.orgId, createdAt: { gte: startOfDay } },
      _sum: { costUsd: true },
      _count: true,
    }),
    db.agentRun.findMany({
      where: { orgId: membership.orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        kind: true,
        status: true,
        model: true,
        tokensIn: true,
        tokensOut: true,
        costUsd: true,
        createdAt: true,
        endedAt: true,
      },
    }),
  ]);

  const cap = DAILY_CAP_USD[membership.org.plan];
  const spent = agg._sum.costUsd ?? 0;

  return NextResponse.json({
    org: {
      id: membership.org.id,
      name: membership.org.name,
      plan: membership.org.plan,
    },
    today: {
      spentUsd: Number(spent.toFixed(6)),
      capUsd: cap,
      remainingUsd: Number(Math.max(0, cap - spent).toFixed(6)),
      callCount: agg._count,
      tokensIn: agg._sum.tokensIn ?? 0,
      tokensOut: agg._sum.tokensOut ?? 0,
    },
    perAgent: perAgent.map((p) => ({
      kind: p.kind as AgentKind,
      callCount: p._count,
      costUsd: Number((p._sum.costUsd ?? 0).toFixed(6)),
    })),
    recent,
  });
}
