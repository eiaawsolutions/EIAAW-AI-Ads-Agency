import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { PlatformChip, PlatformDot } from "@/components/platform/chip";
import { platformClass } from "@/lib/platforms";

export const metadata = { title: "Budget" };

const PLATFORMS = [
  { key: "meta",     spent: 21400, budget: 25000, roas: 3.8, action: "scale" as const },
  { key: "google",   spent: 17800, budget: 22000, roas: 3.1, action: "hold" as const },
  { key: "tiktok",   spent: 7200,  budget: 12000, roas: 1.9, action: "hold" as const },
  { key: "linkedin", spent: 3400,  budget: 6000,  roas: 1.2, action: "kill" as const },
];

const ACTION_VARIANT: Record<string, "live" | "default" | "danger"> = {
  scale: "live",
  hold: "default",
  kill: "danger",
};

export default function BudgetPage() {
  const total = PLATFORMS.reduce((a, p) => a + p.budget, 0);
  const spent = PLATFORMS.reduce((a, p) => a + p.spent, 0);
  return (
    <>
      <DashboardTopbar title="Budget" subtitle="ads-budget · 70/20/10 rule active" />
      <main className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Monthly plan" value={`$${total.toLocaleString()}`} />
          <StatCard label="Spent MTD" value={`$${spent.toLocaleString()}`} hint={`${Math.round((spent / total) * 100)}% of plan`} accent />
          <StatCard label="Remaining" value={`$${(total - spent).toLocaleString()}`} tone="lime" />
          <StatCard label="Daily pace" value="$1,650" hint="On track" tone="amber" />
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <span className="eyebrow">Per-platform allocation</span>
          </div>
          {PLATFORMS.map((p, i) => {
            const pct = (p.spent / p.budget) * 100;
            return (
              <div key={p.key} className={`px-5 py-4 ${i > 0 ? "hairline-t" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <PlatformChip platform={p.key} />
                    <Badge variant={ACTION_VARIANT[p.action]}>{p.action}</Badge>
                    <span className="mono text-xs text-muted-foreground tabular">ROAS {p.roas.toFixed(1)}×</span>
                  </div>
                  <span className="mono text-xs text-muted-foreground tabular">
                    ${p.spent.toLocaleString()} / ${p.budget.toLocaleString()}
                  </span>
                </div>
                {/* Platform-colored bar */}
                <div className={`${platformClass(p.key)} relative h-1.5 rounded-full bg-surface-1 overflow-hidden`}>
                  <div
                    className="absolute inset-y-0 left-0 pf-bar rounded-full transition-all duration-250"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
