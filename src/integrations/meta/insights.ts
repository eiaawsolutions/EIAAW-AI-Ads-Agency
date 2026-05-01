/**
 * Meta Insights ingest.
 *
 * Pulls per-day account-level totals for the last N days and writes them
 * to MetricDaily. Used by the metrics.meta.ingest job step.
 *
 * Notes:
 *  - Meta returns numeric fields as strings; we coerce + clamp.
 *  - "spend" is in account currency; we store it as minor units (cents)
 *    matching the rest of the schema. Multi-currency support is a future
 *    pass; for now we trust the account currency and convert only USD-likes.
 *  - "conversions" comes from the actions array via configurable signal types.
 *  - MetricDaily.campaignId is NOT nullable, so account-level rows are
 *    anchored on a synthetic "Account totals" Campaign per (orgId, platform).
 */
import { Platform, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MetaClient } from "./client";
import type { MetaInsightsRow } from "./types";

const ACCOUNT_TOTALS_NAME = "Account totals (Meta)";
const ACTION_TYPES_AS_CONVERSIONS = new Set([
  "purchase",
  "lead",
  "complete_registration",
  "subscribe",
  "start_trial",
  "offsite_conversion.fb_pixel_purchase",
  "offsite_conversion.fb_pixel_lead",
  "offsite_conversion.fb_pixel_complete_registration",
]);
const ACTION_VALUE_TYPES_AS_REVENUE = new Set([
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
]);

export type IngestResult = {
  ok: true;
  rowsUpserted: number;
  daysCovered: number;
  adAccountId: string;
  adAccountName: string;
  totalSpendMinor: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  syntheticCampaignId: string;
};

/**
 * Pull last `days` days of account-level Insights for the integration's
 * primary ad account and persist as MetricDaily rows.
 *
 * Idempotent: re-running upserts the same rows. Safe to chain into the
 * connect-trigger flow before the audit.
 */
export async function ingestMetaInsights(opts: {
  orgId: string;
  accessToken: string;
  days?: number;
}): Promise<IngestResult> {
  const { orgId, accessToken } = opts;
  const days = Math.min(Math.max(opts.days ?? 30, 1), 90);

  const meta = new MetaClient({ accessToken });

  // Pick the first ACTIVE ad account on the token. If the user has multiple,
  // a future pass will let them choose; for now we take the first active.
  const accounts = await meta.listAdAccounts(50);
  const account =
    accounts.find((a) => a.account_status === 1) ?? accounts[0];
  if (!account) {
    throw new Error("No ad accounts found on this Meta token.");
  }

  const accountId = account.id; // already in act_<n> form
  const accountName = account.name ?? `Meta Account ${accountId}`;

  // Anchor row for account-level metrics.
  const synthetic = await getOrCreateSyntheticCampaign(orgId, accountName);

  // The MetaClient.getInsights() helper doesn't model `time_increment` yet,
  // so we go through .raw() for the daily breakdown.
  const since = new Date();
  since.setDate(since.getDate() - days);
  const dailyRows = await meta.raw<{ data: MetaInsightsRow[] }>("GET", `/${accountId}/insights`, {
    query: {
      level: "account",
      time_range: JSON.stringify({
        since: since.toISOString().slice(0, 10),
        until: new Date().toISOString().slice(0, 10),
      }),
      fields: "spend,impressions,clicks,actions,action_values,ctr,cpc",
      time_increment: 1,
      limit: 200,
    },
  });

  // Aggregate totals for the result summary.
  let totalSpendMinor = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;

  // Build all rows first, then re-ingest the window in a transaction.
  // We use deleteMany + createMany rather than upsert because the unique
  // constraint (date, platform, campaignId, adId) treats NULL adId as
  // distinct in Postgres, so upsert can't reliably target an existing row.
  const rows: Prisma.MetricDailyCreateManyInput[] = [];
  const dateBoundaries = { earliest: null as Date | null, latest: null as Date | null };

  for (const row of dailyRows.data ?? []) {
    const date = new Date(row.date_start + "T00:00:00.000Z");
    const impressions = toInt(row.impressions);
    const clicks = toInt(row.clicks);
    const spendMinor = toMinor(row.spend);
    const { conversions, revenueMinor } = aggregateActions(row);

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spendMinor / clicks / 100 : 0;
    const cpa = conversions > 0 ? spendMinor / conversions / 100 : 0;
    const roas = spendMinor > 0 ? revenueMinor / spendMinor : 0;

    totalSpendMinor += spendMinor;
    totalImpressions += impressions;
    totalClicks += clicks;
    totalConversions += conversions;

    if (!dateBoundaries.earliest || date < dateBoundaries.earliest) dateBoundaries.earliest = date;
    if (!dateBoundaries.latest || date > dateBoundaries.latest) dateBoundaries.latest = date;

    rows.push({
      date,
      platform: Platform.META,
      campaignId: synthetic.id,
      impressions,
      clicks,
      conversions,
      spend: spendMinor,
      revenue: revenueMinor,
      ctr: round(ctr, 3),
      cpc: round(cpc, 2),
      cpa: round(cpa, 2),
      roas: round(roas, 2),
    });
  }

  if (rows.length > 0 && dateBoundaries.earliest && dateBoundaries.latest) {
    await db.$transaction([
      // Wipe existing account-level rows for this synthetic campaign in the
      // window so re-ingest is idempotent. We scope on campaignId so we never
      // touch real campaign rows.
      db.metricDaily.deleteMany({
        where: {
          campaignId: synthetic.id,
          platform: Platform.META,
          date: { gte: dateBoundaries.earliest, lte: dateBoundaries.latest },
          adId: null,
        },
      }),
      db.metricDaily.createMany({ data: rows }),
    ]);
  }

  return {
    ok: true,
    rowsUpserted: rows.length,
    daysCovered: days,
    adAccountId: accountId,
    adAccountName: accountName,
    totalSpendMinor,
    totalImpressions,
    totalClicks,
    totalConversions,
    syntheticCampaignId: synthetic.id,
  };
}

/**
 * Anchor Campaign for account-level Meta metrics so MetricDaily.campaignId
 * (non-null) has a stable target. One per org. Marked with a recognisable
 * name + status so it never appears as a real campaign in dashboards.
 */
async function getOrCreateSyntheticCampaign(
  orgId: string,
  accountName: string,
): Promise<{ id: string }> {
  const existing = await db.campaign.findFirst({
    where: { orgId, name: ACCOUNT_TOTALS_NAME, platforms: { has: Platform.META } },
    select: { id: true },
  });
  if (existing) return existing;

  // Need a brand to anchor the campaign. Pick the first one for the org;
  // if none exists, create a "Default" brand.
  const brand =
    (await db.brand.findFirst({ where: { orgId }, select: { id: true } })) ??
    (await db.brand.create({
      data: { orgId, name: "Default" },
      select: { id: true },
    }));

  const campaign = await db.campaign.create({
    data: {
      orgId,
      brandId: brand.id,
      name: ACCOUNT_TOTALS_NAME,
      objective: "AWARENESS",
      platforms: [Platform.META],
      status: "DRAFT", // never appears as live; the audit/UI treats it as data-only
      currency: "USD",
      strategy: { synthetic: true, source: "meta-insights-ingest", accountName },
    },
    select: { id: true },
  });
  return campaign;
}

function toInt(v: string | number | undefined | null): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? Number.parseInt(v, 10) : v;
  return Number.isFinite(n) ? n : 0;
}

/** Spend in account currency as a string → minor units (cents). */
function toMinor(v: string | number | undefined | null): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function aggregateActions(row: MetaInsightsRow): { conversions: number; revenueMinor: number } {
  let conversions = 0;
  let revenueMinor = 0;
  for (const a of row.actions ?? []) {
    if (ACTION_TYPES_AS_CONVERSIONS.has(a.action_type)) {
      conversions += toInt(a.value);
    }
  }
  for (const av of row.action_values ?? []) {
    if (ACTION_VALUE_TYPES_AS_REVENUE.has(av.action_type)) {
      revenueMinor += toMinor(av.value);
    }
  }
  return { conversions, revenueMinor };
}

function round(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}
