import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { Platform, AgentKind } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * GET /api/admin/wizard-launch-report
 *
 * Read-only operational report on the wizard.launch flow over the trailing
 * 14 days. Designed to be polled by a scheduled remote agent (no session
 * cookie available) — auth is bearer-token via the ADMIN_REPORT_TOKEN env
 * var (resolved from Infisical at boot per the EIAAW Deploy Contract).
 *
 * Returns:
 *  - totals: counts of wizard launches vs other ADS_PLAN runs in window
 *  - perPlatformState: distribution of AdSet states across all wizard
 *    campaigns in window (live / draft / requires_action / failed / unknown)
 *  - failedAdSets: every AdSet stuck in failed state — these are bugs to
 *    follow up on (platform + reason + retryCount + how long stuck)
 *  - staleRequiresAction: AdSets in requires_action for more than 7 days
 *    where retryCount === 0 (user dropped off; UX or outreach signal)
 *
 * Never returns PII, raw tokens, or campaign content — only operational
 * counts + reason strings the UI already shows the operator.
 */
export async function GET(req: Request) {
  const expected = process.env.ADMIN_REPORT_TOKEN;
  if (!expected || expected.length < 16) {
    return NextResponse.json(
      { error: "ADMIN_REPORT_TOKEN not configured" },
      { status: 503 },
    );
  }

  const presented = readBearer(req.headers.get("authorization"));
  if (!presented || !constantTimeEqual(presented, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const windowDays = 14;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // 1. Wizard-launch AgentRun counts vs other ADS_PLAN runs.
  // input.source is a JSON path; Prisma's `path` predicate works on Postgres.
  const [wizardLaunchRuns, otherAdsPlanRuns] = await Promise.all([
    db.agentRun.findMany({
      where: {
        kind: AgentKind.ADS_PLAN,
        createdAt: { gte: since },
        input: { path: ["source"], equals: "wizard.launch" },
      },
      select: { id: true, campaignId: true, createdAt: true },
    }),
    db.agentRun.count({
      where: {
        kind: AgentKind.ADS_PLAN,
        createdAt: { gte: since },
        NOT: { input: { path: ["source"], equals: "wizard.launch" } },
      },
    }),
  ]);

  const wizardCampaignIds = Array.from(
    new Set(wizardLaunchRuns.map((r) => r.campaignId).filter((id): id is string => Boolean(id))),
  );

  // 2. AdSets for those campaigns
  const adSets = wizardCampaignIds.length
    ? await db.adSet.findMany({
        where: { campaignId: { in: wizardCampaignIds } },
        select: {
          id: true,
          campaignId: true,
          platform: true,
          status: true,
          updatedAt: true,
          createdAt: true,
          meta: true,
        },
      })
    : [];

  type AdSetMeta = {
    state?: "live" | "draft" | "requires_action" | "failed";
    reason?: string;
    retryCount?: number;
    launchedAt?: string;
  };

  const perPlatformState: Record<
    string,
    { live: number; draft: number; requires_action: number; failed: number; unknown: number }
  > = {};
  for (const platform of Object.values(Platform)) {
    perPlatformState[platform] = {
      live: 0,
      draft: 0,
      requires_action: 0,
      failed: 0,
      unknown: 0,
    };
  }

  const failedAdSets: Array<{
    campaignId: string;
    platform: Platform;
    reason: string;
    retryCount: number;
    daysStuck: number;
  }> = [];

  const staleRequiresAction: Array<{
    campaignId: string;
    platform: Platform;
    reason: string;
    daysStuck: number;
  }> = [];

  const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const a of adSets) {
    const meta = (a.meta ?? {}) as AdSetMeta;
    const state = meta.state ?? "unknown";
    if (state in perPlatformState[a.platform]!) {
      perPlatformState[a.platform]![state as keyof (typeof perPlatformState)[Platform]] += 1;
    }

    const ageMs = now - a.updatedAt.getTime();
    const daysStuck = Math.floor(ageMs / (24 * 60 * 60 * 1000));

    if (state === "failed") {
      failedAdSets.push({
        campaignId: a.campaignId,
        platform: a.platform,
        reason: meta.reason ?? "(no reason recorded)",
        retryCount: meta.retryCount ?? 0,
        daysStuck,
      });
    }

    if (state === "requires_action" && ageMs > STALE_THRESHOLD_MS && (meta.retryCount ?? 0) === 0) {
      staleRequiresAction.push({
        campaignId: a.campaignId,
        platform: a.platform,
        reason: meta.reason ?? "(no reason recorded)",
        daysStuck,
      });
    }
  }

  return NextResponse.json({
    windowDays,
    sinceUtc: since.toISOString(),
    totals: {
      wizardLaunches: wizardLaunchRuns.length,
      uniqueWizardCampaigns: wizardCampaignIds.length,
      otherAdsPlanRuns,
    },
    perPlatformState,
    failedAdSets,
    staleRequiresAction,
  });
}

function readBearer(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
