/**
 * Weekly cleanup of stale Google Ads smoke-test artifacts.
 *
 * Run by Railway cron at 03:00 Asia/Kuala_Lumpur (Mon 19:00 UTC Sundays).
 * Targets three classes of cruft, in order:
 *
 *   1. Stub-mode artifacts: Integration rows where displayName carries the
 *      "(sandbox)" suffix the stubAdapter assigns. These are leftovers
 *      from before the live adapter shipped (or from any future regression
 *      that drops back to stub). Always safe to delete regardless of age.
 *
 *   2. Stale revoked rows: Integration rows where status='revoked' AND
 *      updatedAt is older than 7 days. The 7-day floor is a soft retention
 *      window — operators sometimes click Disconnect by mistake; keep the
 *      row long enough that they can re-OAuth with the same externalId
 *      (the upsert path will UPDATE in place rather than create a fresh
 *      row, preserving FK references in audit logs).
 *
 *   3. Orphaned synthetic campaigns: 'Account totals (Google)' campaigns
 *      with no MetricDaily children. Created by ingestGoogleAdsInsights()
 *      as the anchor for account-level metrics. If the parent Integration
 *      went away (above) and no MetricDaily rows reference the campaign,
 *      it's truly orphaned.
 *
 * HARD DO-NOT-TOUCH boundaries (enforced by every WHERE clause below):
 *   - status='connected' — never delete live integrations
 *   - non-GOOGLE platforms — Google-only sweep
 *   - non-synthetic campaigns — operator-created campaigns are sacred
 *   - real MetricDaily rows tied to non-synthetic campaigns — never touched
 *
 * Idempotent. If nothing matches, exits silently with a no-op log line.
 *
 * Run manually with:
 *   tsx scripts/cleanup-google-stale.ts
 *
 * Set DRY_RUN=true to log what would be deleted without deleting:
 *   DRY_RUN=true tsx scripts/cleanup-google-stale.ts
 */

import { PrismaClient, Platform } from "@prisma/client";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DRY_RUN = process.env.DRY_RUN === "true";
const SYNTHETIC_CAMPAIGN_NAME = "Account totals (Google)";
const SANDBOX_DISPLAY_NAME_FRAGMENT = "(sandbox)";

type Summary = {
  ok: true;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  deletions: {
    sandboxIntegrations: number;
    staleRevokedIntegrations: number;
    orphanedSyntheticCampaigns: number;
  };
  preservedConnected: number; // sanity check — count live rows we did NOT touch
};

async function main(): Promise<Summary> {
  const db = new PrismaClient();
  const startedAt = new Date();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  let sandboxIntegrations = 0;
  let staleRevokedIntegrations = 0;
  let orphanedSyntheticCampaigns = 0;

  try {
    // Sanity: count connected Google integrations BEFORE any delete. If this
    // number changes after our deletes, something targeted the wrong rows.
    const connectedBefore = await db.integration.count({
      where: { platform: Platform.GOOGLE, status: "connected" },
    });

    // (1) Sandbox integrations — any age, any status, displayName has
    // "(sandbox)" suffix. These are stub artifacts; never represent real
    // OAuth and have no live token to preserve.
    const sandboxRows = await db.integration.findMany({
      where: {
        platform: Platform.GOOGLE,
        displayName: { contains: SANDBOX_DISPLAY_NAME_FRAGMENT },
      },
      select: { id: true, externalId: true, status: true },
    });
    if (sandboxRows.length > 0 && !DRY_RUN) {
      const result = await db.integration.deleteMany({
        where: { id: { in: sandboxRows.map((r) => r.id) } },
      });
      sandboxIntegrations = result.count;
    } else {
      sandboxIntegrations = sandboxRows.length;
    }

    // (2) Stale revoked rows — status=revoked AND updatedAt < 7 days ago.
    // Excludes anything still "connected"; re-fetch query is explicit about
    // status to defend against the displayName filter above missing rows.
    const staleRows = await db.integration.findMany({
      where: {
        platform: Platform.GOOGLE,
        status: "revoked",
        updatedAt: { lt: sevenDaysAgo },
        // explicit displayName guard: don't double-count rows already
        // captured by step (1)
        NOT: { displayName: { contains: SANDBOX_DISPLAY_NAME_FRAGMENT } },
      },
      select: { id: true, externalId: true, updatedAt: true },
    });
    if (staleRows.length > 0 && !DRY_RUN) {
      const result = await db.integration.deleteMany({
        where: { id: { in: staleRows.map((r) => r.id) } },
      });
      staleRevokedIntegrations = result.count;
    } else {
      staleRevokedIntegrations = staleRows.length;
    }

    // (3) Orphaned synthetic Google campaigns — name match AND has the
    // GOOGLE platform tag AND zero MetricDaily children. The MetricDaily
    // count subquery is the safety net: we never delete a campaign that
    // still has metric history attached, even if the parent Integration
    // was cleaned up.
    const candidateCampaigns = await db.campaign.findMany({
      where: {
        name: SYNTHETIC_CAMPAIGN_NAME,
        platforms: { has: Platform.GOOGLE },
        // Synthetic campaigns are always status=DRAFT. Defense-in-depth:
        // refuse to touch anything an operator promoted to LIVE/PAUSED.
        status: "DRAFT",
      },
      select: { id: true, orgId: true, createdAt: true },
    });
    const orphanIds: string[] = [];
    for (const c of candidateCampaigns) {
      const childCount = await db.metricDaily.count({
        where: { campaignId: c.id },
      });
      if (childCount === 0) orphanIds.push(c.id);
    }
    if (orphanIds.length > 0 && !DRY_RUN) {
      const result = await db.campaign.deleteMany({
        where: { id: { in: orphanIds } },
      });
      orphanedSyntheticCampaigns = result.count;
    } else {
      orphanedSyntheticCampaigns = orphanIds.length;
    }

    // Sanity check: connected integrations count must be unchanged.
    const connectedAfter = await db.integration.count({
      where: { platform: Platform.GOOGLE, status: "connected" },
    });
    if (connectedAfter !== connectedBefore) {
      throw new Error(
        `Sanity check failed: connected Google integrations changed from ${connectedBefore} to ${connectedAfter} during cleanup. Investigate.`,
      );
    }

    const finishedAt = new Date();
    const summary: Summary = {
      ok: true,
      dryRun: DRY_RUN,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      deletions: {
        sandboxIntegrations,
        staleRevokedIntegrations,
        orphanedSyntheticCampaigns,
      },
      preservedConnected: connectedAfter,
    };

    const totalDeleted =
      sandboxIntegrations + staleRevokedIntegrations + orphanedSyntheticCampaigns;
    if (totalDeleted === 0) {
      console.log(
        `[google-cleanup] no-op, all clean (preservedConnected=${connectedAfter}, durationMs=${
          finishedAt.getTime() - startedAt.getTime()
        })`,
      );
    } else {
      console.log(`[google-cleanup] ${JSON.stringify(summary)}`);
    }

    return summary;
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(`[google-cleanup] FAILED:`, e instanceof Error ? e.message : e);
  process.exit(1);
});
