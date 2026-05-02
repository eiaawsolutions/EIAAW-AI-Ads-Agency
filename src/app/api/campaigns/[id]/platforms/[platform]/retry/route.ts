import { NextResponse } from "next/server";
import { Platform, AgentRunStatus, AgentKind } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveAuthedOrg } from "@/lib/resolve-org";
import { rateLimit } from "@/lib/rate-limit";
import { launchOnePlatform, stateToCampaignStatus, rollup, type PlatformLaunchResult } from "@/lib/campaign-launch";
import type { AgentContext } from "@/agents/types";

const VALID_PLATFORMS = new Set<Platform>(Object.values(Platform));

/**
 * Re-attempt a single platform launch for an existing campaign.
 *
 * Use case: campaign was created via wizard, Meta came back as
 * "requires_action" because it wasn't connected. User connects Meta on the
 * integrations page, returns to the campaign detail, and clicks "Retry on
 * Meta". We re-run launchOnePlatform against the existing AdSet, update its
 * meta + externalId + status, and recompute the campaign rollup.
 *
 * Auth: requires the user to be a member of the campaign's org with at least
 * STRATEGIST role (anyone who can run the wizard can retry).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; platform: string }> },
) {
  const { id: campaignId, platform: rawPlatform } = await params;

  const ctx = await resolveAuthedOrg();
  if (!ctx) return NextResponse.json({ error: "unauthed" }, { status: 401 });
  if (ctx.role === "VIEWER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const platform = rawPlatform.toUpperCase() as Platform;
  if (!VALID_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: `unknown platform: ${rawPlatform}` }, { status: 400 });
  }

  // Per-org rate limit. 30/hr is generous for legitimate manual retries while
  // blocking infinite-loop scripts hammering a stuck integration.
  const limited = await rateLimit(`retry-launch:${ctx.orgId}`, { limit: 30, windowSec: 3600 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many retries. Wait ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, orgId: ctx.orgId },
    include: { adSets: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: "campaign_not_found" }, { status: 404 });
  }

  const adSet = campaign.adSets.find((a) => a.platform === platform);
  if (!adSet) {
    return NextResponse.json(
      { error: `${platform} is not part of this campaign` },
      { status: 400 },
    );
  }

  const agentCtx: AgentContext = {
    orgId: ctx.orgId,
    brandId: campaign.brandId,
    campaignId: campaign.id,
    userId: ctx.userId,
    executionMode: ctx.org.executionMode,
  };

  const dailyBudgetMinor = adSet.dailyBudget ?? 0;
  let result: PlatformLaunchResult;
  try {
    result = await launchOnePlatform(agentCtx, platform, {
      campaignName: campaign.name,
      objective: campaign.objective,
      dailyBudgetMinor,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[retry-launch] unexpected:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await db.adSet.update({
    where: { id: adSet.id },
    data: {
      externalId: result.externalCampaignId,
      status: stateToCampaignStatus(result.state),
      meta: {
        state: result.state,
        reason: result.reason,
        remediation: result.remediation,
        adapterMode: result.adapterMode,
        launchedAt: new Date().toISOString(),
        log: result.log,
        retryCount:
          (typeof adSet.meta === "object" && adSet.meta !== null && "retryCount" in adSet.meta
            ? Number((adSet.meta as { retryCount?: number }).retryCount ?? 0)
            : 0) + 1,
      },
    },
  });

  // Recompute rollup from the latest AdSet states.
  const updated = await db.adSet.findMany({
    where: { campaignId: campaign.id },
    select: { meta: true },
  });
  const allStates = updated.map((a) => ({
    state:
      ((a.meta as { state?: string } | null)?.state ?? "draft") as
      | "live"
      | "draft"
      | "requires_action"
      | "failed",
  }));
  const newRollup = rollup(allStates);
  if (newRollup !== campaign.status) {
    await db.campaign.update({ where: { id: campaign.id }, data: { status: newRollup } });
  }

  await db.agentRun
    .create({
      data: {
        orgId: ctx.orgId,
        campaignId: campaign.id,
        kind: AgentKind.ADS_PLAN,
        status: AgentRunStatus.SUCCEEDED,
        input: { source: "campaign.retry", platform },
        output: {
          platform: result.platform,
          state: result.state,
          externalCampaignId: result.externalCampaignId,
          reason: result.reason,
          rollupStatus: newRollup,
        },
        startedAt: new Date(),
        endedAt: new Date(),
      },
    })
    .catch(() => null);

  return NextResponse.json({
    ok: true,
    platform: result.platform,
    state: result.state,
    externalCampaignId: result.externalCampaignId,
    reason: result.reason,
    remediation: result.remediation,
    adapterMode: result.adapterMode,
    rollupStatus: newRollup,
  });
}
