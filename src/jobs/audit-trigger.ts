import { JobKind, JobStatus, Platform, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { enqueueJob } from "./enqueue";

export type AuditTriggerSource = "manual" | "connect" | "weekly";

export type AuditEnqueueResult =
  | { enqueued: true; jobId: string; correlationId: string; perPlatform: number }
  | { enqueued: false; reason: string; lastJobId?: string };

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1_000;
const AUDIT_CORRELATION_PREFIX = "audit:";

/**
 * Pull a compact, real-data summary the ads-audit agent can score against.
 * 30d totals per platform plus the integration's connected status + scopes.
 *
 * We deliberately keep this light — the agent works off totals + signals,
 * not raw rows. Saves tokens, keeps the audit reproducible.
 */
async function buildPlatformInputs(orgId: string) {
  const start30 = new Date();
  start30.setDate(start30.getDate() - 30);

  const [integrations, metrics, campaigns] = await Promise.all([
    db.integration.findMany({
      where: { orgId },
      select: { platform: true, status: true, scopes: true, expiresAt: true, displayName: true },
    }),
    db.metricDaily.groupBy({
      by: ["platform"],
      where: { campaign: { orgId }, date: { gte: start30 } },
      _sum: { impressions: true, clicks: true, conversions: true, spend: true, revenue: true },
      _count: true,
    }),
    db.campaign.findMany({
      where: { orgId, status: { in: ["LIVE", "SCHEDULED", "PAUSED"] } },
      select: { platforms: true, status: true, dailyBudget: true },
    }),
  ]);

  // Group by platform: the audit agent runs once per platform that has signal,
  // OR (if nothing connected yet) once at org-level so the agent can flag the
  // missing-integration P0 itself instead of silently returning nothing.
  const byPlatform = new Map<Platform, ReturnType<typeof emptyInput>>();

  function emptyInput(platform: Platform) {
    return {
      platform: platform.toLowerCase(),
      integration: {
        connected: false,
        scopes: [] as string[],
        expiringSoon: false,
        accountName: null as string | null,
      },
      metricsSummary: {
        days: 30,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spendUsd: 0,
        revenueUsd: 0,
        ctr: 0,
        cpa: 0,
        roas: 0,
      },
      structure: {
        liveCampaigns: 0,
        pausedCampaigns: 0,
        scheduledCampaigns: 0,
        dailyBudgetUsd: 0,
      },
    };
  }

  for (const intg of integrations) {
    const cur = byPlatform.get(intg.platform) ?? emptyInput(intg.platform);
    cur.integration.connected = intg.status === "connected";
    cur.integration.scopes = intg.scopes;
    cur.integration.accountName = intg.displayName ?? null;
    cur.integration.expiringSoon = !!(
      intg.expiresAt && intg.expiresAt.getTime() - Date.now() < 7 * 86_400_000
    );
    byPlatform.set(intg.platform, cur);
  }

  for (const m of metrics) {
    const cur = byPlatform.get(m.platform) ?? emptyInput(m.platform);
    const impressions = m._sum.impressions ?? 0;
    const clicks = m._sum.clicks ?? 0;
    const conversions = m._sum.conversions ?? 0;
    const spend = (m._sum.spend ?? 0) / 100;
    const revenue = (m._sum.revenue ?? 0) / 100;
    cur.metricsSummary = {
      days: 30,
      impressions,
      clicks,
      conversions,
      spendUsd: Number(spend.toFixed(2)),
      revenueUsd: Number(revenue.toFixed(2)),
      ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(3)) : 0,
      cpa: conversions > 0 ? Number((spend / conversions).toFixed(2)) : 0,
      roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
    };
    byPlatform.set(m.platform, cur);
  }

  for (const c of campaigns) {
    for (const p of c.platforms) {
      const cur = byPlatform.get(p) ?? emptyInput(p);
      if (c.status === "LIVE") cur.structure.liveCampaigns += 1;
      if (c.status === "PAUSED") cur.structure.pausedCampaigns += 1;
      if (c.status === "SCHEDULED") cur.structure.scheduledCampaigns += 1;
      if (c.dailyBudget) cur.structure.dailyBudgetUsd += c.dailyBudget / 100 / c.platforms.length;
      byPlatform.set(p, cur);
    }
  }

  return Array.from(byPlatform.values());
}

/**
 * 24h dedup floor. Returns the most-recent audit JobRun for this org if it
 * was enqueued or completed in the last 24h. The caller uses this to skip
 * re-enqueuing — protects against connect/disconnect loops, button mashing,
 * and double-cron firing.
 */
async function findRecentAudit(orgId: string) {
  const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
  return db.jobRun.findFirst({
    where: {
      orgId,
      kind: JobKind.AGENT_CHAIN,
      correlationId: { startsWith: AUDIT_CORRELATION_PREFIX },
      createdAt: { gte: cutoff },
      status: { in: [JobStatus.PENDING, JobStatus.RUNNING, JobStatus.SUCCEEDED] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, createdAt: true },
  });
}

/**
 * Enqueue an ads-audit job for an org. Idempotent over a 24h window so
 * connect-triggers and weekly-crons can't burn budget. Returns a tagged
 * union so callers can show "queued" vs "skipped (recent)" UX.
 *
 * The job is one AGENT_CHAIN with one step per connected platform (or one
 * org-level step if nothing is connected yet, so the agent can flag the
 * missing-integration finding itself).
 */
export async function enqueueAuditFor(
  orgId: string,
  source: AuditTriggerSource,
  opts: { force?: boolean; actorId?: string } = {},
): Promise<AuditEnqueueResult> {
  if (!opts.force) {
    const recent = await findRecentAudit(orgId);
    if (recent) {
      return {
        enqueued: false,
        reason: `An audit was already ${recent.status.toLowerCase()} ${Math.round(
          (Date.now() - recent.createdAt.getTime()) / 60_000,
        )}m ago. Wait 24h or pass force=true.`,
        lastJobId: recent.id,
      };
    }
  }

  const inputs = await buildPlatformInputs(orgId);
  const platformInputs = inputs.length > 0 ? inputs : [
    {
      platform: "global",
      integration: { connected: false, scopes: [], expiringSoon: false, accountName: null },
      metricsSummary: { days: 30, impressions: 0, clicks: 0, conversions: 0, spendUsd: 0, revenueUsd: 0, ctr: 0, cpa: 0, roas: 0 },
      structure: { liveCampaigns: 0, pausedCampaigns: 0, scheduledCampaigns: 0, dailyBudgetUsd: 0 },
    },
  ];

  const correlationId = `${AUDIT_CORRELATION_PREFIX}${orgId}:${Date.now()}`;

  const { id } = await enqueueJob({
    orgId,
    kind: JobKind.AGENT_CHAIN,
    input: { source, platformCount: platformInputs.length } as Record<string, unknown>,
    correlationId,
    steps: platformInputs.map((pi) => ({
      kind: "agent.ads-audit",
      input: pi as unknown as Record<string, unknown>,
    })),
  });

  // Telemetry — tells future us why a particular audit ran.
  await db.auditLog
    .create({
      data: {
        orgId,
        actorId: opts.actorId ?? null,
        action: "audit.enqueued",
        target: id,
        meta: { source, platformCount: platformInputs.length, correlationId } as Prisma.InputJsonValue,
      },
    })
    .catch(() => undefined);

  return { enqueued: true, jobId: id, correlationId, perPlatform: platformInputs.length };
}
