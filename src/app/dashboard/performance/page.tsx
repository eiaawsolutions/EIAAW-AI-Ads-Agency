import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { db } from "@/lib/db";

export const metadata = { title: "Performance" };
export const dynamic = "force-dynamic";

async function loadMetrics() {
  const grouped = await db.metricDaily
    .groupBy({
      by: ["platform"],
      _sum: { impressions: true, clicks: true, conversions: true, spend: true, revenue: true },
    })
    .catch(() => [] as { platform: string; _sum: Record<string, number | null> }[]);
  return grouped;
}

export default async function PerformancePage() {
  const metrics = await loadMetrics();
  return (
    <>
      <DashboardTopbar title="Performance" subtitle="All campaigns · last 30 days" />
      <main className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Revenue" value="$164,892" delta={18.2} accent />
          <StatCard label="ROAS" value="3.42×" delta={12.4} />
          <StatCard label="CPM" value="$12.40" delta={-2.1} />
          <StatCard label="CTR" value="1.48%" delta={0.6} />
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
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
                {metrics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                      No data yet. Seed the database to see metrics.
                    </td>
                  </tr>
                ) : (
                  metrics.map((m) => {
                    const spend = (m._sum.spend ?? 0) / 100;
                    const rev = (m._sum.revenue ?? 0) / 100;
                    const roas = rev / Math.max(spend, 1);
                    return (
                      <tr key={m.platform} className="hairline-t hover:bg-surface-1/50 transition-colors duration-150">
                        <td className="px-5 py-3 text-sm font-medium text-foreground">{m.platform}</td>
                        <td className="px-5 py-3 mono text-xs tabular text-right text-foreground/90">{(m._sum.impressions ?? 0).toLocaleString()}</td>
                        <td className="px-5 py-3 mono text-xs tabular text-right text-foreground/90">{(m._sum.clicks ?? 0).toLocaleString()}</td>
                        <td className="px-5 py-3 mono text-xs tabular text-right text-foreground/90">{(m._sum.conversions ?? 0).toLocaleString()}</td>
                        <td className="px-5 py-3 mono text-xs tabular text-right text-foreground/90">${spend.toLocaleString()}</td>
                        <td className="px-5 py-3 mono text-xs tabular text-right text-foreground/90">${rev.toLocaleString()}</td>
                        <td className="px-5 py-3 mono text-xs tabular text-right text-primary">{roas.toFixed(2)}×</td>
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
