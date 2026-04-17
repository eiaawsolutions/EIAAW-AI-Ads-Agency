import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown } from "lucide-react";

export const metadata = { title: "Reports" };

const REPORTS = [
  { name: "Weekly — Mar 31 to Apr 6", cadence: "Weekly", insight: "ROAS +12%. Proof-led creatives beat benefit-led by 18%. Kill TikTok prospecting set 04." },
  { name: "Monthly — March 2026", cadence: "Monthly", insight: "Meta drove 58% of revenue on 41% of spend. Recommend shifting $8k from LinkedIn to Meta for April." },
  { name: "Weekly — Mar 24 to Mar 30", cadence: "Weekly", insight: "CPA stable. Creative fatigue on 3 top ads; ads-generate queued 4 variants." },
];

export default function ReportsPage() {
  return (
    <>
      <DashboardTopbar title="Automated reports" subtitle="Daily / weekly / monthly · AI-generated insights" />
      <main className="p-8 space-y-4">
        {REPORTS.map((r) => (
          <Card key={r.name} className="p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold">{r.name}</h3>
                  <Badge variant="outline">{r.cadence}</Badge>
                </div>
                <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{r.insight}</p>
              </div>
              <Button variant="secondary" size="sm"><FileDown /> PDF</Button>
            </div>
          </Card>
        ))}
      </main>
    </>
  );
}
