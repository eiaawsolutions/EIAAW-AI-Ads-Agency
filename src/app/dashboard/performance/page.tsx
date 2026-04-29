import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { PlatformChip } from "@/components/platform/chip";
import { db } from "@/lib/db";
import { getActiveOrgOrRedirect } from "@/lib/active-org";

export const metadata = { title: "Performance" };
export const dynamic = "force-dynamic";

const MS_PER_DAY = 86_400_000;

function pctDelta(current: number, prior: number): number | undefined {
  if (prior === 0) return undefined;
  return ((current - prior) / prior) * 100;
}

export default async function PerformancePage() {
  const ctx = await getActiveOrgOrRedirect();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start30 = new Date(today.getTime() - 29 * MS_PER_DAY);
  const startPrior30 = new Date(today.getTime() - 59 * MS_PER_DAY);

  const [grouped, current, prior] = await Promise.all([
    db.metricDaily.groupBy({
      by: ["platform"],
      where: { campaign: { orgId: ctx.orgId }, date: { gte: start30 } },
      _sum: { impressions: true, clicks: true, conversions: true, spend: true, revenue: true },
    }),
    db.metricDaily.aggregate({
      where: { campaign: { orgId: ctx.orgId }, date: { gte: start30 } },
      _sum: { impressions: true, clicks: true, conversions: true, spend: true, revenue: true },
    }),
    db.metricDaily.aggregate({
      where: { campaign: { orgId: ctx.orgId }, date: { gte: startPrior30, lt: start30 } },
      _sum: { impressions: true, clicks: true, conversions: true, spend: true, revenue: true },
    }),
  ]);

  const cur = {
    impressions: current._sum.impressions ?? 0,
    clicks: current._sum.clicks ?? 0,
    conversions: current._sum.conversions ?? 0,
    spend: (current._sum.spend ?? 0) / 100,
    revenue: (current._sum.revenue ?? 0) / 100,
  };
  const prv = {
    impressions: prior._sum.impressions ?? 0,
    clicks: prior._sum.clicks ?? 0,
    spend: (prior._sum.spend ?? 0) / 100,
    revenue: (prior._sum.revenue ?? 0) / 100,
  };
  const roas = cur.spend > 0 ? cur.revenue / cur.spend : 0;
  const priorRoas = prv.spend > 0 ? prv.revenue / prv.spend : 0;
  const cpm = cur.impressions > 0 ? (cur.spend / cur.impressions) * 1000 : 0;
  const priorCpm = prv.impressions > 0 ? (prv.spend / prv.impressions) * 1000 : 0;
  const ctr = cur.impressions > 0 ? (cur.clicks / cur.impressions) * 100 : 0;
  const priorCtr = prv.impressions > 0 ? (prv.clicks / prv.impressions) * 100 : 0;

  return (
    <>
      <DashboardTopbar title="Performance" subtitle="All campaigns · last 30 days" />
      <main className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Revenue"
            value={cur.revenue > 0 ? `$${Math.round(cur.revenue).toLocaleString()}` : "—"}
            delta={pctDelta(cur.revenue, prv.revenue)}
            accent
          />
          <StatCard
            label="ROAS"
            value={roas > 0 ? `${roas.toFixed(2)}×` : "—"}
            delta={pctDelta(roas, priorRoas)}
            tone="lime"
          />
          <StatCard
            label="CPM"
            value={cpm > 0 ? `$${cpm.toFixed(2)}` : "—"}
            delta={pctDelta(cpm, priorCpm) !== undefined ? -pctDelta(cpm, priorCpm)! : undefined}
          />
          <StatCard
            label="CTR"
            value={ctr > 0 ? `${ctr.toFixed(2)}%` : "—"}
            delta={pctDelta(ctr, priorCtr)}
            tone="coral"
          />
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <span className="eyebrow">Platform breakdown</span>
            <div className="flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="mono text-2xs text-muted-foreground">LIVE</span>
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="hairline-b">
                  <th className="text-left eyebrow px-5 py-2.5">Platform</th>
                  <th className="text-right eyebrow px-5 py-2.5">Impressions</th>
                  <th className="text-right eyebrow px-5 py-2.5">Clicks</th>
                  <th className="text-right eyebrow px-5 py-2.5">Conversions</th>
                  <th className="text-right eyebrow px-5 py-2.5">Spend</th>
                  <th className="text-right eyebrow px-5 py-2.5">Revenue</th>
                  <th className="text-right eyebrow px-5 py-2.5">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {grouped.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                      No data yet. Connect a platform from Integrations to start ingesting metrics.
                    </td>
                  </tr>
                ) : (
                  grouped.map((m) => {
                    const spend = (m._sum.spend ?? 0) / 100;
                    const rev = (m._sum.revenue ?? 0) / 100;
                    const r = spend > 0 ? rev / spend : 0;
                    return (
                      <tr key={m.platform} className="hairline-t hover:bg-surface-1/60 transition-colors duration-150">
                        <td className="px-5 py-3">
                          <PlatformChip platform={m.platform} />
                        </td>
                        <td className="px-5 py-3 mono text-xs tabular text-right text-foreground/90">
                          {(m._sum.impressions ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 mono text-xs tabular text-right text-foreground/90">
                          {(m._sum.clicks ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 mono text-xs tabular text-right text-foreground/90">
                          {(m._sum.conversions ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 mono text-xs tabular text-right text-foreground/90">
                          ${Math.round(spend).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 mono text-xs tabular text-right text-foreground/90">
                          ${Math.round(rev).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 mono text-xs tabular text-right text-primary">
                          {r > 0 ? `${r.toFixed(2)}×` : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
