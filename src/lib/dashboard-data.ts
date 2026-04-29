import type { Platform } from "@prisma/client";
import { db } from "./db";

const MS_PER_DAY = 86_400_000;

export type PlatformKey = "meta" | "google" | "tiktok" | "linkedin" | "microsoft" | "youtube" | "apple";

function toKey(p: Platform): PlatformKey {
  return p.toLowerCase() as PlatformKey;
}

function pctDelta(current: number, prior: number): number | undefined {
  if (prior === 0) return undefined;
  return ((current - prior) / prior) * 100;
}

export type OverviewSnapshot = {
  totals30d: {
    spendUsd: number;
    revenueUsd: number;
    conversions: number;
    roas: number;
    cpa: number;
    cpaDelta?: number;
    roasDelta?: number;
    spendDelta?: number;
    conversionsDelta?: number;
  };
  chart: { date: string; meta: number; google: number; tiktok: number }[];
  experiments: {
    id: string;
    name: string;
    kind: string;
    status: "DRAFT" | "RUNNING" | "COMPLETED" | "ABORTED";
    confidence: number;
    primaryPlatform: PlatformKey;
  }[];
  recentRuns: {
    id: string;
    kind: string;
    status: string;
    relativeTime: string;
    note: string;
  }[];
  totalSpendPaceUsdPerDay: number;
  hasAnyData: boolean;
};

function relativeTime(end: Date | null, fallback: Date): string {
  const t = (end ?? fallback).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

export async function loadOverview(orgId: string): Promise<OverviewSnapshot> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start30 = new Date(today.getTime() - 29 * MS_PER_DAY);
  const startPrior30 = new Date(today.getTime() - 59 * MS_PER_DAY);

  const [current, prior, perPlatformDay, experiments, recentRunsRaw, campaignSpend] = await Promise.all([
    db.metricDaily.aggregate({
      where: { campaign: { orgId }, date: { gte: start30 } },
      _sum: { spend: true, revenue: true, conversions: true },
    }),
    db.metricDaily.aggregate({
      where: { campaign: { orgId }, date: { gte: startPrior30, lt: start30 } },
      _sum: { spend: true, revenue: true, conversions: true },
    }),
    db.metricDaily.findMany({
      where: { campaign: { orgId }, date: { gte: start30 } },
      select: { date: true, platform: true, roas: true, spend: true, revenue: true },
    }),
    db.experiment.findMany({
      where: { orgId, status: { in: ["RUNNING", "COMPLETED"] } },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { campaign: { select: { platforms: true } } },
    }),
    db.agentRun.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, kind: true, status: true, output: true, createdAt: true, endedAt: true },
    }),
    db.campaign.aggregate({
      where: { orgId, status: { in: ["LIVE", "SCHEDULED"] } },
      _sum: { dailyBudget: true },
    }),
  ]);

  const spendUsd = (current._sum.spend ?? 0) / 100;
  const revenueUsd = (current._sum.revenue ?? 0) / 100;
  const conversions = current._sum.conversions ?? 0;
  const priorSpendUsd = (prior._sum.spend ?? 0) / 100;
  const priorRevenueUsd = (prior._sum.revenue ?? 0) / 100;
  const priorConversions = prior._sum.conversions ?? 0;
  const roas = spendUsd > 0 ? revenueUsd / spendUsd : 0;
  const priorRoas = priorSpendUsd > 0 ? priorRevenueUsd / priorSpendUsd : 0;
  const cpa = conversions > 0 ? spendUsd / conversions : 0;
  const priorCpa = priorConversions > 0 ? priorSpendUsd / priorConversions : 0;

  const chartByDate = new Map<string, { meta: number[]; google: number[]; tiktok: number[] }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(start30.getTime() + i * MS_PER_DAY);
    chartByDate.set(d.toISOString().slice(5, 10), { meta: [], google: [], tiktok: [] });
  }
  for (const m of perPlatformDay) {
    const key = m.date.toISOString().slice(5, 10);
    const bucket = chartByDate.get(key);
    if (!bucket) continue;
    if (m.platform === "META") bucket.meta.push(m.roas);
    if (m.platform === "GOOGLE") bucket.google.push(m.roas);
    if (m.platform === "TIKTOK") bucket.tiktok.push(m.roas);
  }
  const chart = Array.from(chartByDate.entries()).map(([date, b]) => ({
    date,
    meta: b.meta.length ? Number((b.meta.reduce((a, x) => a + x, 0) / b.meta.length).toFixed(2)) : 0,
    google: b.google.length ? Number((b.google.reduce((a, x) => a + x, 0) / b.google.length).toFixed(2)) : 0,
    tiktok: b.tiktok.length ? Number((b.tiktok.reduce((a, x) => a + x, 0) / b.tiktok.length).toFixed(2)) : 0,
  }));

  const experimentsOut = experiments.map((e) => ({
    id: e.id,
    name: e.name,
    kind: e.kind,
    status: e.status,
    confidence: Math.round((e.confidence ?? 0) * 100) || 0,
    primaryPlatform: toKey((e.campaign?.platforms?.[0] ?? "META") as Platform),
  }));

  const recentRuns = recentRunsRaw.map((r) => {
    const summary =
      typeof r.output === "object" && r.output && "summary" in r.output
        ? String((r.output as { summary?: string }).summary ?? "").slice(0, 80)
        : "";
    return {
      id: r.id,
      kind: r.kind.toLowerCase().replace(/_/g, "-"),
      status: r.status.toLowerCase(),
      relativeTime: relativeTime(r.endedAt, r.createdAt),
      note: summary || r.kind.toLowerCase().replace(/_/g, "-"),
    };
  });

  return {
    totals30d: {
      spendUsd,
      revenueUsd,
      conversions,
      roas,
      cpa,
      cpaDelta: pctDelta(cpa, priorCpa),
      roasDelta: pctDelta(roas, priorRoas),
      spendDelta: pctDelta(spendUsd, priorSpendUsd),
      conversionsDelta: pctDelta(conversions, priorConversions),
    },
    chart,
    experiments: experimentsOut,
    recentRuns,
    totalSpendPaceUsdPerDay: (campaignSpend._sum.dailyBudget ?? 0) / 100,
    hasAnyData: spendUsd > 0 || revenueUsd > 0 || conversions > 0,
  };
}
