import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Budget" };

const PLATFORMS = [
  { name: "Meta",     spent: 21400, budget: 25000, roas: 3.8, action: "scale" as const },
  { name: "Google",   spent: 17800, budget: 22000, roas: 3.1, action: "hold" as const },
  { name: "TikTok",   spent: 7200,  budget: 12000, roas: 1.9, action: "hold" as const },
  { name: "LinkedIn", spent: 3400,  budget: 6000,  roas: 1.2, action: "kill" as const },
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
          <StatCard label="Remaining" value={`$${(total - spent).toLocaleString()}`} />
          <StatCard label="Daily pace" value="$1,650" hint="On track" />
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <span className="eyebrow">Per-platform allocation</span>
          </div>
          {PLATFORMS.map((p, i) => (
            <div key={p.name} className={`px-5 py-4 ${i > 0 ? "hairline-t" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground min-w-[80px]">{p.name}</span>
                  <Badge variant={ACTION_VARIANT[p.action]}>{p.action}</Badge>
                  <span className="mono text-xs text-muted-foreground tabular">ROAS {p.roas.toFixed(1)}×</span>
                </div>
                <span className="mono text-xs text-muted-foreground tabular">
                  ${p.spent.toLocaleString()} / ${p.budget.toLocaleString()}
                </span>
              </div>
              <Progress value={(p.spent / p.budget) * 100} />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
