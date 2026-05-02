import { NextResponse } from "next/server";
import { Platform, AgentRunStatus, AgentKind, CampaignStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveAuthedOrg } from "@/lib/resolve-org";
import { rateLimit } from "@/lib/rate-limit";
import { getAdapter } from "@/integrations/registry";

const VALID_PLATFORMS = new Set<Platform>(Object.values(Platform));

/**
 * Activate a previously-launched (PAUSED) campaign on the given platform.
 *
 * Requires the AdSet to be in `state: "live"` AND have an externalId — i.e.
 * the launch pipeline successfully created the campaign upstream and we
 * just need to flip the status. Anything else fails clean with an
 * explanation, not a 500.
 *
 * Why not bundle activate into launch:
 *   We never auto-publish on launch. The operator must explicitly review
 *   the rendered ad in their platform Ads Manager (image rendering, copy
 *   placement on each surface, targeting estimate) before authorizing
 *   spend. Activate is the explicit go-live action.
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

  // Activations spend real money — keep the rate limit tight to prevent
  // accidental double-clicks turning into multiple status flips. 10/hour
  // per org is plenty for legitimate use.
  const limited = await rateLimit(`activate-launch:${ctx.orgId}`, { limit: 10, windowSec: 3600 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many activations. Wait ${limited.retryAfterSec}s.` },
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
    return NextResponse.json({ error: `${platform} is not part of this campaign` }, { status: 400 });
  }
  if (!adSet.externalId) {
    return NextResponse.json(
      { error: `${platform} campaign was never created on the platform — retry launch first` },
      { status: 409 },
    );
  }
  const adSetMeta = (adSet.meta ?? {}) as { state?: string };
  if (adSetMeta.state !== "live") {
    return NextResponse.json(
      {
        error: `${platform} is in state '${adSetMeta.state ?? "unknown"}' — only campaigns in state 'live' (created on platform, paused) can be activated`,
      },
      { status: 409 },
    );
  }

  const adapter = getAdapter(platform);
  if (adapter.mode !== "live") {
    return NextResponse.json(
      { error: `${platform} adapter is in stub mode — nothing to activate on a real platform` },
      { status: 400 },
    );
  }

  try {
    const result = await adapter.execute(
      {
        orgId: ctx.orgId,
        brandId: campaign.brandId,
        campaignId: campaign.id,
        userId: ctx.userId,
        executionMode: ctx.org.executionMode,
      },
      { action: "activate", campaignId: campaign.id, payload: { campaignId: adSet.externalId } },
    );

    // Reflect the activation in our DB:
    //   AdSet.status: PAUSED → ACTIVE
    //   Campaign.status: PAUSED → LIVE (only if every AdSet is now LIVE)
    await db.adSet.update({
      where: { id: adSet.id },
      data: {
        status: CampaignStatus.LIVE,
        meta: {
          ...(adSet.meta as Record<string, unknown>),
          state: "live",
          activatedAt: new Date().toISOString(),
          log: [...(((adSet.meta as { log?: string[] }).log) ?? []), ...(result.log ?? [])],
        },
      },
    });

    const fresh = await db.adSet.findMany({
      where: { campaignId: campaign.id },
      select: { status: true },
    });
    const allLive = fresh.every((a) => a.status === CampaignStatus.LIVE);
    if (allLive && campaign.status !== CampaignStatus.LIVE) {
      await db.campaign.update({ where: { id: campaign.id }, data: { status: CampaignStatus.LIVE } });
    }

    await db.agentRun
      .create({
        data: {
          orgId: ctx.orgId,
          campaignId: campaign.id,
          kind: AgentKind.ADS_PLAN,
          status: AgentRunStatus.SUCCEEDED,
          input: { source: "campaign.activate", platform, externalId: adSet.externalId },
          output: { log: result.log ?? [] },
          startedAt: new Date(),
          endedAt: new Date(),
        },
      })
      .catch(() => null);

    return NextResponse.json({
      ok: true,
      platform,
      activated: true,
      log: result.log ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[activate-launch] failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
