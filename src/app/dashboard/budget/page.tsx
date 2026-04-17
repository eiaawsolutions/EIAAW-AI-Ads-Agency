import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Budget" };

const PLATFORMS = [
  { name: "Meta", spent: 21400, budget: 25000, roas: 3.8, action: "scale" },
  { name: "Google", spent: 17800, budget: 22000, roas: 3.1, action: "hold" },
  { name: "TikTok", spent: 7200, budget: 12000, roas: 1.9, action: "hold" },
  { name: "LinkedIn", spent: 3400, budget: 6000, roas: 1.2, action: "kill" },
];

export default function BudgetPage() {
  const total = PLATFORMS.reduce((a, p) => a + p.budget, 0);
  const spent = PLATFORMS.reduce((a, p) => a + p.spent, 0);
  return (
    <>
      <DashboardTopbar title="Budget control" subtitle="ads-budget · 70/20/10 rule active" />
      <main className="p-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Monthly plan" value={`$${total.toLocaleString()}`} />
          <StatCard label="Spent MTD" value={`$${spent.toLocaleString()}`} hint={`${Math.round((spent / total) * 100)}% of plan`} accent />
          <StatCard label="Remaining" value={`$${(total - spent).toLocaleString()}`} />
          <StatCard label="Pace" value="On track" hint="Daily burn $1,650" />
        </div>

        <Card className="p-6">
          <h3 className="text-sm font-semibold">Per-platform allocation</h3>
          <div className="mt-5 space-y-5">
            {PLATFORMS.map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{p.name}</span>
                    <Badge variant={p.action === "scale" ? "live" : p.action === "hold" ? "outline" : "danger"}>
                      {p.action}
                    </Badge>
                    <span className="font-mono text-[11px] text-brand-300">ROAS {p.roas.toFixed(1)}×</span>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    ${p.spent.toLocaleString()} / ${p.budget.toLocaleString()}
                  </div>
                </div>
                <Progress value={(p.spent / p.budget) * 100} />
              </div>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
