import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { PlatformChip } from "@/components/platform/chip";
import { platformClass } from "@/lib/platforms";
import { getActiveOrgOrRedirect } from "@/lib/active-org";
import { db } from "@/lib/db";
import type { Platform } from "@prisma/client";

export const metadata = { title: "Budget" };
export const dynamic = "force-dynamic";

const ACTION_VARIANT: Record<"scale" | "hold" | "kill", "live" | "default" | "danger"> = {
  scale: "live",
  hold: "default",
  kill: "danger",
};

function classify(roas: number): "scale" | "hold" | "kill" {
  if (roas >= 3.5) return "scale";
  if (roas >= 1.5) return "hold";
  return "kill";
}

export default async function BudgetPage() {
  const ctx = await getActiveOrgOrRedirect();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(1); // month-to-date

  const [perPlatform, campaigns] = await Promise.all([
    db.metricDaily.groupBy({
      by: ["platform"],
      where: { campaign: { orgId: ctx.orgId }, date: { gte: start } },
      _sum: { spend: true, revenue: true, conversions: true },
    }),
    db.campaign.findMany({
      where: { orgId: ctx.orgId, status: { in: ["LIVE", "SCHEDULED"] } },
      select: { dailyBudget: true, platforms: true },
    }),
  ]);

  const dailyBudgetByPlatform = new Map<Platform, number>();
  for (const c of campaigns) {
    if (!c.dailyBudget || c.platforms.length === 0) continue;
    const share = c.dailyBudget / c.platforms.length;
    for (const p of c.platforms) {
      dailyBudgetByPlatform.set(p, (dailyBudgetByPlatform.get(p) ?? 0) + share);
    }
  }
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();

  type Row = { key: string; spent: number; budget: number; roas: number; action: "scale" | "hold" | "kill" };
  const rows: Row[] = perPlatform.map((p) => {
    const spent = (p._sum.spend ?? 0) / 100;
    const revenue = (p._sum.revenue ?? 0) / 100;
    const roas = spent > 0 ? revenue / spent : 0;
    const dailyBudget = (dailyBudgetByPlatform.get(p.platform) ?? 0) / 100;
    const budget = dailyBudget * daysInMonth;
    return { key: p.platform.toLowerCase(), spent, budget, roas, action: classify(roas) };
  });

  // Include zero-spend planned platforms so the page reflects the plan, not just history.
  for (const [pf, daily] of dailyBudgetByPlatform.entries()) {
    if (rows.find((r) => r.key === pf.toLowerCase())) continue;
    rows.push({ key: pf.toLowerCase(), spent: 0, budget: (daily / 100) * daysInMonth, roas: 0, action: "hold" });
  }

  const total = rows.reduce((a, r) => a + r.budget, 0);
  const spent = rows.reduce((a, r) => a + r.spent, 0);
  const todayDailyTotal = Array.from(dailyBudgetByPlatform.values()).reduce((a, x) => a + x, 0) / 100;

  const subtitle = total > 0 ? "ads-budget · 70/20/10 rule active" : "ads-budget · no budgets set yet";

  return (
    <>
      <DashboardTopbar title="Budget" subtitle={subtitle} />
      <main className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Monthly plan" value={`$${Math.round(total).toLocaleString()}`} />
          <StatCard
            label="Spent MTD"
            value={`$${Math.round(spent).toLocaleString()}`}
            hint={total > 0 ? `${Math.round((spent / total) * 100)}% of plan` : "—"}
            accent
          />
          <StatCard
            label="Remaining"
            value={`$${Math.round(Math.max(0, total - spent)).toLocaleString()}`}
            tone="lime"
          />
          <StatCard
            label="Daily pace"
            value={`$${Math.round(todayDailyTotal).toLocaleString()}`}
            hint={todayDailyTotal > 0 ? "from active campaigns" : "no campaigns live"}
            tone="amber"
          />
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <span className="eyebrow">Per-platform allocation</span>
          </div>
          {rows.length === 0 ? (
            <div className="px-5 py-16 text-center text-xs text-muted-foreground">
              No spend or planned budget yet. Create a campaign and connect a platform to start.
            </div>
          ) : (
            rows.map((p, i) => {
              const pct = p.budget > 0 ? (p.spent / p.budget) * 100 : 0;
              return (
                <div key={p.key} className={`px-5 py-4 ${i > 0 ? "hairline-t" : ""}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <PlatformChip platform={p.key} />
                      <Badge variant={ACTION_VARIANT[p.action]}>{p.action}</Badge>
                      <span className="mono text-xs text-muted-foreground tabular">
                        ROAS {p.roas > 0 ? `${p.roas.toFixed(1)}×` : "—"}
                      </span>
                    </div>
                    <span className="mono text-xs text-muted-foreground tabular">
                      ${Math.round(p.spent).toLocaleString()} / ${Math.round(p.budget).toLocaleString()}
                    </span>
                  </div>
                  <div className={`${platformClass(p.key)} relative h-1.5 rounded-full bg-surface-1 overflow-hidden`}>
                    <div
                      className="absolute inset-y-0 left-0 pf-bar rounded-full transition-all duration-250"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
