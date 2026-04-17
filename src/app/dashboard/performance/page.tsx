import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";

export const metadata = { title: "Performance" };
export const dynamic = "force-dynamic";

async function loadMetrics() {
  const grouped = await db.metricDaily.groupBy({
    by: ["platform"],
    _sum: { impressions: true, clicks: true, conversions: true, spend: true, revenue: true },
  }).catch(() => [] as { platform: string; _sum: Record<string, number | null> }[]);
  return grouped;
}

export default async function PerformancePage() {
  const metrics = await loadMetrics();
  return (
    <>
      <DashboardTopbar title="Performance" subtitle="All campaigns · last 30 days" />
      <main className="p-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Revenue" value="$164,892" delta={18.2} />
          <StatCard label="ROAS" value="3.42×" delta={12.4} accent />
          <StatCard label="CPM" value="$12.40" delta={-2.1} />
          <StatCard label="CTR" value="1.48%" delta={0.6} />
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold">Platform breakdown</h3>
            <Badge>live</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-3">Platform</th>
                  <th className="py-3">Impressions</th>
                  <th className="py-3">Clicks</th>
                  <th className="py-3">Conversions</th>
                  <th className="py-3">Spend</th>
                  <th className="py-3">Revenue</th>
                  <th className="py-3">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {metrics.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No data yet. Seed the database to see live metrics.</td></tr>
                ) : metrics.map((m) => {
                  const spend = (m._sum.spend ?? 0) / 100;
                  const rev = (m._sum.revenue ?? 0) / 100;
                  const roas = rev / Math.max(spend, 1);
                  return (
                    <tr key={m.platform} className="border-t border-white/5">
                      <td className="py-3 font-medium">{m.platform}</td>
                      <td className="py-3 font-mono text-xs">{(m._sum.impressions ?? 0).toLocaleString()}</td>
                      <td className="py-3 font-mono text-xs">{(m._sum.clicks ?? 0).toLocaleString()}</td>
                      <td className="py-3 font-mono text-xs">{(m._sum.conversions ?? 0).toLocaleString()}</td>
                      <td className="py-3 font-mono text-xs">${spend.toLocaleString()}</td>
                      <td className="py-3 font-mono text-xs">${rev.toLocaleString()}</td>
                      <td className="py-3 font-mono text-xs text-brand-300">{roas.toFixed(2)}×</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}
