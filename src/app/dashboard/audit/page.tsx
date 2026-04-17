import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Audit" };

const FINDINGS = [
  { sev: "P0", area: "tracking",  note: "CAPI not deduplicating Pixel events on Meta.",          fix: "Set event_id parity across pixel + server." },
  { sev: "P1", area: "creative",  note: "Fatigue at 2.4 frequency on 3 top ads.",                fix: "Auto-queued 4 replacements via ads-generate." },
  { sev: "P1", area: "structure", note: "Audience overlap >35% between ad sets 02 and 07.",      fix: "Merge or add exclusions." },
  { sev: "P2", area: "bids",      note: "Manual CPC active on 2 Google campaigns.",              fix: "Switch to Maximize Conversions once data threshold met." },
  { sev: "P2", area: "landing",   note: "LCP 3.1s on /sale — exceeds 2.5s threshold.",           fix: "Optimize hero image, add preload hint." },
];

const SEV_VARIANT: Record<string, "danger" | "warn" | "outline"> = { P0: "danger", P1: "warn", P2: "outline", P3: "outline" };

export default function AuditPage() {
  return (
    <>
      <DashboardTopbar title="Audit" subtitle="ads-audit · 250 checks · score 78/100" />
      <main className="p-6">
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <span className="eyebrow">Findings</span>
            <span className="mono text-xs text-muted-foreground tabular">{FINDINGS.length}</span>
          </div>
          {FINDINGS.map((f, i) => (
            <div key={i} className={`grid grid-cols-[60px_100px_1fr] gap-4 px-5 py-4 hover:bg-surface-1/50 transition-colors duration-150 ${i > 0 ? "hairline-t" : ""}`}>
              <Badge variant={SEV_VARIANT[f.sev]} className="w-fit h-fit mt-0.5">{f.sev}</Badge>
              <span className="mono text-xs text-muted-foreground uppercase mt-1">{f.area}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{f.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">Fix: {f.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
