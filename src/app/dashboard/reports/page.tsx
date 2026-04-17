import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export const metadata = { title: "Reports" };

const REPORTS = [
  { date: "Apr 06", name: "Weekly — Mar 31 to Apr 6",   cadence: "Weekly",  insight: "ROAS +12%. Proof-led creatives beat benefit-led by 18%. Kill TikTok prospecting set 04." },
  { date: "Mar 31", name: "Monthly — March 2026",        cadence: "Monthly", insight: "Meta drove 58% of revenue on 41% of spend. Recommend shifting $8k from LinkedIn to Meta for April." },
  { date: "Mar 30", name: "Weekly — Mar 24 to Mar 30",  cadence: "Weekly",  insight: "CPA stable. Creative fatigue on 3 top ads; ads-generate queued 4 variants." },
];

export default function ReportsPage() {
  return (
    <>
      <DashboardTopbar title="Reports" subtitle="Daily / weekly / monthly · AI-generated" />
      <main className="p-6">
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {REPORTS.map((r, i) => (
            <div key={r.name} className={`px-5 py-5 ${i > 0 ? "hairline-t" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="mono text-xs text-muted-foreground tabular shrink-0">{r.date}</span>
                    <h3 className="text-sm font-medium text-foreground">{r.name}</h3>
                    <Badge variant="outline">{r.cadence}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-3xl">{r.insight}</p>
                </div>
                <Button variant="subtle" size="sm"><FileDown className="h-3 w-3" /> PDF</Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
