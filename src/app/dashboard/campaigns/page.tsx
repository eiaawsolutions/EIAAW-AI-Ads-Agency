import Link from "next/link";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata = { title: "Campaigns" };

const CAMPAIGNS = [
  { name: "Q2 Spring Launch", status: "LIVE", platforms: ["Meta", "Google", "TikTok"], spent: 48210, budget: 75000, roas: 3.42 },
  { name: "Re-engagement flow", status: "LIVE", platforms: ["Meta"], spent: 12400, budget: 20000, roas: 4.8 },
  { name: "Holiday prospecting", status: "SCHEDULED", platforms: ["Meta", "TikTok", "YouTube"], spent: 0, budget: 120000, roas: 0 },
];

export default function CampaignsPage() {
  return (
    <>
      <DashboardTopbar title="Campaigns" subtitle={`${CAMPAIGNS.length} total · 2 live`} />
      <main className="p-8 space-y-6">
        <div className="flex justify-end">
          <Button asChild variant="gradient"><Link href="/onboarding"><Plus /> New campaign</Link></Button>
        </div>
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground border-b border-white/5">
                <th className="px-5 py-4">Campaign</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Platforms</th>
                <th className="px-5 py-4">Spent / Budget</th>
                <th className="px-5 py-4">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS.map((c) => (
                <tr key={c.name} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-medium">{c.name}</td>
                  <td className="px-5 py-4"><Badge variant={c.status === "LIVE" ? "live" : "outline"}>{c.status}</Badge></td>
                  <td className="px-5 py-4 font-mono text-xs text-brand-300">{c.platforms.join(" · ")}</td>
                  <td className="px-5 py-4 font-mono text-xs">${c.spent.toLocaleString()} / ${c.budget.toLocaleString()}</td>
                  <td className="px-5 py-4 font-mono text-xs text-brand-300">{c.roas > 0 ? c.roas.toFixed(2) + "×" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}
