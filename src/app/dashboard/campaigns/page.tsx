import Link from "next/link";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformChip } from "@/components/platform/chip";
import { Plus } from "lucide-react";

export const metadata = { title: "Campaigns" };

const CAMPAIGNS = [
  { name: "Q2 Spring Launch",   status: "LIVE" as const,      platforms: ["meta", "google", "tiktok"],  spent: 48210, budget: 75000,  roas: 3.42 },
  { name: "Re-engagement flow", status: "LIVE" as const,      platforms: ["meta"],                      spent: 12400, budget: 20000,  roas: 4.80 },
  { name: "Holiday prospecting",status: "SCHEDULED" as const, platforms: ["meta", "tiktok", "youtube"], spent: 0,     budget: 120000, roas: 0 },
];

export default function CampaignsPage() {
  return (
    <>
      <DashboardTopbar title="Campaigns" subtitle={`${CAMPAIGNS.length} total · 2 live`} />
      <main className="p-6 space-y-6">
        <div className="flex justify-end">
          <Button asChild variant="secondary">
            <Link href="/onboarding"><Plus className="h-3.5 w-3.5" /> New campaign</Link>
          </Button>
        </div>
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="hairline-b">
                <th className="text-left eyebrow px-5 py-2.5">Campaign</th>
                <th className="text-left eyebrow px-5 py-2.5">Status</th>
                <th className="text-left eyebrow px-5 py-2.5">Platforms</th>
                <th className="text-right eyebrow px-5 py-2.5">Spent / Budget</th>
                <th className="text-right eyebrow px-5 py-2.5">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS.map((c, i) => (
                <tr key={c.name} className={`hover:bg-surface-1/60 transition-colors duration-150 ${i > 0 ? "hairline-t" : ""}`}>
                  <td className="px-5 py-3.5 text-sm font-medium text-foreground">{c.name}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={c.status === "LIVE" ? "live" : "default"}>{c.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {c.platforms.map((p) => (
                        <PlatformChip key={p} platform={p} />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 mono text-xs tabular text-right text-foreground/90">
                    ${c.spent.toLocaleString()} / ${c.budget.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 mono text-xs tabular text-right text-primary">
                    {c.roas > 0 ? `${c.roas.toFixed(2)}×` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
