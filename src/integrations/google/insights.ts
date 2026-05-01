/**
 * Google Ads Insights ingest.
 *
 * Pulls per-day account-level totals for the last N days and writes them
 * to MetricDaily. Mirrors src/integrations/meta/insights.ts so the audit
 * machinery sees Google data in the same shape as Meta data.
 *
 * Notes:
 *  - Google Ads returns money as `costMicros` (1 USD = 1_000_000 micros).
 *    We convert to minor units (cents) before persisting, matching
 *    MetricDaily.spend semantics shared with Meta.
 *  - GAQL `customer.id` and `customer.descriptive_name` come back on every
 *    row when included in the SELECT, so we don't need a separate lookup
 *    for the synthetic anchor name.
 *  - MetricDaily.campaignId is NOT nullable, so account-level rows are
 *    anchored on a synthetic "Account totals (Google)" Campaign per
 *    (orgId, platform).
 *  - searchStream is used for the daily breakdown to avoid multi-page RTTs.
 */
import { Platform, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { GoogleAdsClient } from "./client";
import type { SearchRow } from "./types";

const ACCOUNT_TOTALS_NAME = "Account totals (Google)";

export type GoogleIngestResult = {
  ok: true;
  rowsUpserted: number;
  daysCovered: number;
  customerId: string;
  customerName: string;
  totalSpendMinor: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  syntheticCampaignId: string;
};

/**
 * Pull last `days` days of account-level metrics for the customer and
 * persist as MetricDaily rows. Idempotent — re-running upserts the same rows.
 */
export async function ingestGoogleAdsInsights(opts: {
  orgId: string;
  accessToken: string;
  developerToken: string;
  /** 10-digit customer ID (with or without dashes) to query against. */
  customerId: string;
  /**
   * MCC (manager) ID to set as `login-customer-id` if the customer is
   * managed under an MCC. Skip if querying a direct customer.
   */
  loginCustomerId?: string;
  days?: number;
}): Promise<GoogleIngestResult> {
  const { orgId, accessToken, developerToken, customerId, loginCustomerId } = opts;
  const days = Math.min(Math.max(opts.days ?? 30, 1), 90);

  const client = new GoogleAdsClient({
    accessToken,
    developerToken,
    loginCustomerId,
  });

  // Pull customer descriptive_name once so the synthetic campaign carries it.
  const customerRows = await client.search<SearchRow>(
    customerId,
    "SELECT customer.id, customer.descriptive_name, customer.currency_code FROM customer LIMIT 1",
  );
  const customer = customerRows[0]?.customer;
  const customerIdResolved = customer?.id ?? customerId.replace(/-/g, "");
  const customerName = customer?.descriptiveName ?? `Google Ads Account ${customerIdResolved}`;

  // Anchor row for account-level metrics.
  const synthetic = await getOrCreateSyntheticCampaign(orgId, customerName);

  // GAQL: pull per-day metrics across all campaigns aggregated under
  // segments.date. We filter on the date range using `during LAST_N_DAYS`
  // for symmetry with the Meta time_range pattern.
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  const untilStr = new Date().toISOString().slice(0, 10);

  const gaql = `
    SELECT
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM customer
    WHERE segments.date BETWEEN '${sinceStr}' AND '${untilStr}'
    ORDER BY segments.date
  `.trim();

  const rows = await client.searchStream<SearchRow>(customerIdResolved, gaql);

  // Aggregate totals for the result summary.
  let totalSpendMinor = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;

  // GAQL with `FROM customer` returns one row per segment.date with
  // metrics already summed across all campaigns under the customer. So
  // each row maps directly to one MetricDaily row.
  const records: Prisma.MetricDailyCreateManyInput[] = [];
  const dateBoundaries = { earliest: null as Date | null, latest: null as Date | null };

  for (const row of rows) {
    const dateStr = row.segments?.date;
    if (!dateStr) continue;
    const date = new Date(dateStr + "T00:00:00.000Z");
    const impressions = toInt(row.metrics?.impressions);
    const clicks = toInt(row.metrics?.clicks);
    const spendMinor = microsToMinor(row.metrics?.costMicros);
    const conversions = Math.round(row.metrics?.conversions ?? 0);
    const revenueMinor = Math.round((row.metrics?.conversionsValue ?? 0) * 100);

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

    records.push({
      date,
      platform: Platform.GOOGLE,
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

  if (records.length > 0 && dateBoundaries.earliest && dateBoundaries.latest) {
    await db.$transaction([
      db.metricDaily.deleteMany({
        where: {
          campaignId: synthetic.id,
          platform: Platform.GOOGLE,
          date: { gte: dateBoundaries.earliest, lte: dateBoundaries.latest },
          adId: null,
        },
      }),
      db.metricDaily.createMany({ data: records }),
    ]);
  }

  return {
    ok: true,
    rowsUpserted: records.length,
    daysCovered: days,
    customerId: customerIdResolved,
    customerName,
    totalSpendMinor,
    totalImpressions,
    totalClicks,
    totalConversions,
    syntheticCampaignId: synthetic.id,
  };
}

/**
 * Anchor Campaign for account-level Google metrics so MetricDaily.campaignId
 * (non-null in practice for our anchor pattern) has a stable target.
 * One per org. Mirrors the Meta synthetic-anchor pattern exactly.
 */
async function getOrCreateSyntheticCampaign(
  orgId: string,
  accountName: string,
): Promise<{ id: string }> {
  const existing = await db.campaign.findFirst({
    where: { orgId, name: ACCOUNT_TOTALS_NAME, platforms: { has: Platform.GOOGLE } },
    select: { id: true },
  });
  if (existing) return existing;

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
      platforms: [Platform.GOOGLE],
      status: "DRAFT",
      currency: "USD",
      strategy: { synthetic: true, source: "google-ads-insights-ingest", accountName },
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

/** Google Ads costMicros (1_000_000 micros = 1 unit) → minor units (cents). */
function microsToMinor(v: string | number | undefined | null): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  if (!Number.isFinite(n)) return 0;
  // 1 unit = 100 cents = 1_000_000 micros, so cents = micros / 10_000
  return Math.round(n / 10_000);
}

function round(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}
