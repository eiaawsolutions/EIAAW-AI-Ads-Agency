import { Platform, CampaignStatus, AgentRunStatus, AgentKind, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAdapter } from "@/integrations/registry";
import type { AgentContext } from "@/agents/types";

export type PlatformLaunchState =
  | "live" // adapter call succeeded against a real platform
  | "draft" // stub adapter — recorded but not pushed anywhere real
  | "requires_action" // adapter is live but blocked (no integration / read-only access / etc.)
  | "failed"; // adapter threw

export type PlatformLaunchResult = {
  platform: Platform;
  state: PlatformLaunchState;
  externalCampaignId: string | null;
  /** All entity IDs the adapter created (campaign, adset, creative, ad). */
  externalIds?: Record<string, string>;
  reason: string;
  remediation: { label: string; href: string } | null;
  adapterMode: "live" | "stub";
  log: string[];
};

export type MetaCreativeInput = {
  pageId: string;
  pixelId?: string;
  landingUrl: string;
  headline: string;
  primaryText: string;
  description?: string;
  cta: string;
  imageHash: string;
};

export type LaunchInput = {
  orgId: string;
  userId?: string;
  brandName: string;
  domain?: string;
  objective: "SALES" | "LEADS" | "APP_INSTALLS" | "TRAFFIC" | "AWARENESS" | "ENGAGEMENT";
  monthlyBudget: number; // in major units (e.g. 5000 = $5,000)
  currency: string;
  targetLocation: string;
  platforms: Platform[];
  strategy?: Record<string, unknown>; // ads-plan output, optional
  creatives?: { META?: MetaCreativeInput };
};

export type LaunchOutcome = {
  campaignId: string;
  campaignName: string;
  rollupStatus: CampaignStatus;
  results: PlatformLaunchResult[];
};

/**
 * Always-create launch flow.
 *
 * The Campaign row is created unconditionally so the user has a single record
 * to track state against. Each selected platform gets a per-platform AdSet
 * row, and we attempt the live adapter call. The result of each attempt is
 * stored in AdSet.meta so the UI can show "live / draft / requires_action /
 * failed" with the user-actionable remediation step.
 *
 * The Campaign rollup status is derived: if any platform is LIVE we mark the
 * campaign LIVE; if all platforms are DRAFT/blocked we keep it DRAFT.
 *
 * This function never throws on per-platform failures — it captures them and
 * reports them. It only throws if the Campaign itself can't be persisted
 * (db error), which is the only case the caller should treat as fatal.
 */
export async function launchCampaign(input: LaunchInput): Promise<LaunchOutcome> {
  if (input.platforms.length === 0) {
    throw new Error("At least one platform must be selected");
  }

  // Resolve or create the Brand row. Wizard treats brandName as the natural
  // key per org — match the existing pattern other places in the wizard use.
  const brand = await upsertBrand(input.orgId, input.brandName, input.domain);

  // Daily budget = monthly / 30, in minor units.
  const dailyBudgetMinor = Math.max(0, Math.round((input.monthlyBudget / 30) * 100));
  const totalBudgetMinor = Math.max(0, Math.round(input.monthlyBudget * 100));

  const campaign = await db.campaign.create({
    data: {
      orgId: input.orgId,
      brandId: brand.id,
      name: `${input.brandName} — ${input.objective}`.slice(0, 120),
      objective: input.objective,
      platforms: input.platforms,
      status: CampaignStatus.DRAFT, // recompute after per-platform pass
      currency: input.currency,
      dailyBudget: dailyBudgetMinor,
      totalBudget: totalBudgetMinor,
      strategy: (input.strategy ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  const ctx: AgentContext = {
    orgId: input.orgId,
    brandId: brand.id,
    campaignId: campaign.id,
    userId: input.userId,
    executionMode: "ASSISTED",
  };

  const results: PlatformLaunchResult[] = [];
  for (const platform of input.platforms) {
    const platformCreative =
      platform === Platform.META ? input.creatives?.META : undefined;
    const result = await launchOnePlatform(ctx, platform, {
      campaignName: campaign.name,
      objective: input.objective,
      dailyBudgetMinor,
      targetLocation: input.targetLocation,
      currency: input.currency,
      creative: platformCreative,
    });

    await db.adSet.create({
      data: {
        campaignId: campaign.id,
        platform,
        externalId: result.externalCampaignId,
        name: `${campaign.name} · ${platform}`,
        dailyBudget: dailyBudgetMinor,
        status: stateToCampaignStatus(result.state),
        meta: {
          state: result.state,
          reason: result.reason,
          remediation: result.remediation,
          adapterMode: result.adapterMode,
          launchedAt: new Date().toISOString(),
          log: result.log,
          // Persist the launch inputs so /retry can replay without making
          // the operator re-fill the wizard. creative is platform-scoped
          // and may be undefined for platforms that don't yet take one
          // (Google etc. — those replay with no creative data anyway).
          launchInputs: {
            targetLocation: input.targetLocation,
            currency: input.currency,
            creative: platformCreative,
          },
          // Persist the structured external IDs for downstream use
          // (activate, sync_metrics, future ad-level optimizations).
          externalIds: result.externalIds ?? null,
        },
      },
    });

    results.push(result);
  }

  const rollupStatus = rollup(results);
  if (rollupStatus !== campaign.status) {
    await db.campaign.update({
      where: { id: campaign.id },
      data: { status: rollupStatus },
    });
  }

  // Audit row so the launch shows on Live monitor.
  await db.agentRun
    .create({
      data: {
        orgId: input.orgId,
        campaignId: campaign.id,
        kind: AgentKind.ADS_PLAN,
        status: AgentRunStatus.SUCCEEDED,
        input: {
          source: "wizard.launch",
          platforms: input.platforms,
          monthlyBudget: input.monthlyBudget,
          currency: input.currency,
          targetLocation: input.targetLocation,
        },
        output: {
          campaignId: campaign.id,
          rollupStatus,
          results: results.map((r) => ({
            platform: r.platform,
            state: r.state,
            externalCampaignId: r.externalCampaignId,
            reason: r.reason,
          })),
        },
        startedAt: new Date(),
        endedAt: new Date(),
      },
    })
    .catch(() => null);

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    rollupStatus,
    results,
  };
}

async function upsertBrand(orgId: string, name: string, domain?: string) {
  const safeName = name?.trim() || "Untitled brand";
  const existing = await db.brand.findFirst({
    where: { orgId, name: safeName },
    select: { id: true },
  });
  if (existing) return existing;
  return db.brand.create({
    data: { orgId, name: safeName, domain: domain || null },
    select: { id: true },
  });
}

export async function launchOnePlatform(
  ctx: AgentContext,
  platform: Platform,
  payload: {
    campaignName: string;
    objective: string;
    dailyBudgetMinor: number;
    targetLocation: string;
    currency: string;
    creative?: MetaCreativeInput;
  },
): Promise<PlatformLaunchResult> {
  const adapter = getAdapter(platform);
  const log: string[] = [];

  // Stub adapters succeed but the campaign isn't pushed anywhere real — be
  // honest: state = "draft", reason explains, remediation links to /dashboard/integrations
  // so the operator can connect a real account.
  if (adapter.mode === "stub") {
    try {
      const r = await adapter.execute(ctx, {
        action: "launch",
        campaignId: ctx.campaignId,
        payload: {
          name: payload.campaignName,
          objective: payload.objective,
          dailyBudget: payload.dailyBudgetMinor,
          targetLocation: payload.targetLocation,
          currency: payload.currency,
          creative: payload.creative,
        },
      });
      log.push(...(r.log ?? []));
      return {
        platform,
        state: "draft",
        externalCampaignId: r.externalIds?.campaign ?? null,
        reason: `${platform} adapter is in sandbox mode — campaign saved locally but not pushed to ${platform}.`,
        remediation: {
          label: `Connect ${formatPlatform(platform)} to go live`,
          href: "/dashboard/integrations",
        },
        adapterMode: "stub",
        log,
      };
    } catch (err) {
      return failed(platform, err, "stub", log);
    }
  }

  // Live adapter: requires an Integration row first.
  const integration = await db.integration.findFirst({
    where: { orgId: ctx.orgId, platform, status: "connected" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, externalId: true, expiresAt: true },
  });
  if (!integration) {
    return {
      platform,
      state: "requires_action",
      externalCampaignId: null,
      reason: `${formatPlatform(platform)} is not connected. Campaign saved as draft until OAuth completes.`,
      remediation: {
        label: `Connect ${formatPlatform(platform)}`,
        href: "/dashboard/integrations",
      },
      adapterMode: "live",
      log,
    };
  }
  if (integration.expiresAt && integration.expiresAt.getTime() < Date.now()) {
    return {
      platform,
      state: "requires_action",
      externalCampaignId: null,
      reason: `${formatPlatform(platform)} access token expired — reconnect to push this campaign.`,
      remediation: {
        label: `Reconnect ${formatPlatform(platform)}`,
        href: "/dashboard/integrations",
      },
      adapterMode: "live",
      log,
    };
  }

  try {
    const r = await adapter.execute(ctx, {
      action: "launch",
      campaignId: ctx.campaignId,
      payload: {
        name: payload.campaignName,
        objective: payload.objective,
        dailyBudget: payload.dailyBudgetMinor,
        adAccountId: integration.externalId ?? undefined,
        targetLocation: payload.targetLocation,
        currency: payload.currency,
        creative: payload.creative,
      },
    });
    log.push(...(r.log ?? []));

    // Adapter convention: when a write is gated (e.g. Google Standard Access
    // pending), it returns success with a log line containing "not yet
    // supported" and no externalIds.campaign. Treat that as requires_action
    // rather than a silent success.
    const externalCampaignId = r.externalIds?.campaign ?? null;
    const gatedHint = (r.log ?? []).find((l) => /not yet supported|requires? .*access/i.test(l));
    if (!externalCampaignId && gatedHint) {
      return {
        platform,
        state: "requires_action",
        externalCampaignId: null,
        reason: gatedHint,
        remediation: remediationForGate(platform),
        adapterMode: "live",
        log,
      };
    }

    if (!externalCampaignId) {
      return {
        platform,
        state: "failed",
        externalCampaignId: null,
        reason: `${formatPlatform(platform)} adapter returned no campaign id.`,
        remediation: null,
        adapterMode: "live",
        log,
      };
    }

    return {
      platform,
      state: "live",
      externalCampaignId,
      externalIds: r.externalIds,
      reason: `Campaign created on ${formatPlatform(platform)} (${externalCampaignId}). Status starts paused — review and activate when ready.`,
      remediation: null,
      adapterMode: "live",
      log,
    };
  } catch (err) {
    return failed(platform, err, "live", log);
  }
}

function failed(
  platform: Platform,
  err: unknown,
  adapterMode: "live" | "stub",
  log: string[],
): PlatformLaunchResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    platform,
    state: "failed",
    externalCampaignId: null,
    reason: message,
    remediation: null,
    adapterMode,
    log: [...log, `[${platform}] error: ${message}`],
  };
}

function remediationForGate(platform: Platform): { label: string; href: string } | null {
  if (platform === "GOOGLE") {
    return {
      label: "Request Google Ads Standard Access",
      href: "https://ads.google.com/aw/apicenter",
    };
  }
  return { label: `Open ${formatPlatform(platform)} settings`, href: "/dashboard/integrations" };
}

export function stateToCampaignStatus(state: PlatformLaunchState): CampaignStatus {
  switch (state) {
    case "live":
      // Adapter creates upstream campaign in PAUSED state for safety.
      // Reflect that in our model so we don't lie about LIVE.
      return CampaignStatus.PAUSED;
    case "draft":
    case "requires_action":
    case "failed":
      return CampaignStatus.DRAFT;
  }
}

export function rollup(results: { state: PlatformLaunchState }[]): CampaignStatus {
  if (results.some((r) => r.state === "live")) return CampaignStatus.PAUSED;
  return CampaignStatus.DRAFT;
}

function formatPlatform(p: Platform): string {
  return p.charAt(0) + p.slice(1).toLowerCase();
}
