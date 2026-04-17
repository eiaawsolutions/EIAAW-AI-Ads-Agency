import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Audit" };

const FINDINGS = [
  { sev: "P0", area: "tracking", note: "CAPI not deduplicating Pixel events on Meta.", fix: "Set event_id parity across pixel + server." },
  { sev: "P1", area: "creative", note: "Fatigue at 2.4 frequency on 3 top ads.", fix: "Auto-queued 4 replacements via ads-generate." },
  { sev: "P1", area: "structure", note: "Audience overlap >35% between ad sets 02 and 07.", fix: "Merge or add exclusions." },
  { sev: "P2", area: "bids", note: "Manual CPC active on 2 Google campaigns.", fix: "Switch to Maximize Conversions once data threshold met." },
];

export default function AuditPage() {
  return (
    <>
      <DashboardTopbar title="Audit" subtitle="ads-audit · 250+ checks · score 78/100" />
      <main className="p-8 space-y-4">
        {FINDINGS.map((f) => (
          <Card key={f.note} className="p-6">
            <div className="flex items-start gap-4">
              <Badge variant={f.sev === "P0" ? "danger" : f.sev === "P1" ? "warn" : "outline"}>{f.sev}</Badge>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-brand-300 uppercase">{f.area}</span>
                </div>
                <p className="mt-2 text-sm font-medium">{f.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">Fix: {f.fix}</p>
              </div>
            </div>
          </Card>
        ))}
      </main>
    </>
  );
}
