import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { resolveAuthedOrg } from "@/lib/resolve-org";
import { ingestMetaInsights } from "@/integrations/meta/insights";

/**
 * On-demand Meta Insights re-sync.
 *
 * Pulls the last 30 days of account-level Insights and writes daily rows
 * to MetricDaily. Triggered by the integrations page "Sync now" button or
 * the weekly cron. Per-org rate-limited so click-spamming can't blow the
 * Marketing API quota.
 */
export async function POST(req: Request) {
  const ctx = await resolveAuthedOrg();
  if (!ctx) return NextResponse.json({ error: "unauthed" }, { status: 401 });
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const limited = await rateLimit(`meta-sync:${ctx.orgId}`, { limit: 6, windowSec: 3600 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const integration = await db.integration.findFirst({
    where: { orgId: ctx.orgId, platform: Platform.META, status: "connected" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, accessToken: true, expiresAt: true },
  });
  if (!integration?.accessToken) {
    return NextResponse.json(
      { error: "Meta is not connected for this org." },
      { status: 400 },
    );
  }
  if (integration.expiresAt && integration.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Meta access token has expired. Reconnect to re-authorize." },
      { status: 400 },
    );
  }

  let accessToken: string;
  try {
    accessToken = decryptSecret(integration.accessToken);
  } catch {
    return NextResponse.json(
      { error: "Stored token failed to decrypt — reconnect Meta." },
      { status: 500 },
    );
  }

  const days = Number(new URL(req.url).searchParams.get("days") ?? "30");
  try {
    const result = await ingestMetaInsights({
      orgId: ctx.orgId,
      accessToken,
      days: Number.isFinite(days) ? days : 30,
    });
    return NextResponse.json({
      ok: true,
      adAccount: { id: result.adAccountId, name: result.adAccountName },
      daysCovered: result.daysCovered,
      rowsUpserted: result.rowsUpserted,
      totals: {
        spendUsd: result.totalSpendMinor / 100,
        impressions: result.totalImpressions,
        clicks: result.totalClicks,
        conversions: result.totalConversions,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[meta-insights:sync] failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
