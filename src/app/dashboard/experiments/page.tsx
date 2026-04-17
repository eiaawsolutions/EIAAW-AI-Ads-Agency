import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformChip } from "@/components/platform/chip";
import { Plus } from "lucide-react";

export const metadata = { title: "Experiments" };

const EXPERIMENTS = [
  { id: "exp_17", name: "Headline: benefit vs proof",   kind: "headline",  status: "running" as const,   conf: 86, platform: "meta",    variants: ["A: Benefit", "B: Proof"] },
  { id: "exp_18", name: "CTA: Shop now vs Try risk-free", kind: "cta",     status: "running" as const,   conf: 62, platform: "google",  variants: ["A: Shop now", "B: Try risk-free"] },
  { id: "exp_19", name: "Audience: LAL 1% vs 3%",       kind: "audience",  status: "running" as const,   conf: 44, platform: "tiktok",  variants: ["A: 1%", "B: 3%"] },
  { id: "exp_15", name: "Creative: UGC vs studio",       kind: "creative", status: "completed" as const, conf: 98, platform: "meta",    variants: ["A: UGC (winner)", "B: Studio"] },
];

export default function ExperimentsPage() {
  return (
    <>
      <DashboardTopbar title="Experiments" subtitle="ads-test · closed-loop learning" />
      <main className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Running & recent</span>
          <Button variant="secondary"><Plus className="h-3.5 w-3.5" /> New experiment</Button>
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {EXPERIMENTS.map((e, i) => (
            <div key={e.id} className={`p-5 ${i > 0 ? "hairline-t" : ""}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="mono text-xs text-muted-foreground shrink-0">{e.id}</span>
                  <span className="text-sm font-medium text-foreground truncate">{e.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PlatformChip platform={e.platform} />
                  <Badge variant={e.status === "running" ? "live" : "solid"}>{e.status}</Badge>
                  <span className="mono text-2xs text-muted-foreground">{e.kind}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {e.variants.map((v) => (
                  <span key={v} className="mono text-2xs px-2 py-1 rounded border border-border bg-surface-1 text-foreground">
                    {v}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative h-1.5 flex-1 rounded-full bg-surface-1 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-250"
                    style={{
                      width: `${e.conf}%`,
                      background: e.conf >= 95
                        ? "linear-gradient(90deg, hsl(172 72% 48%), hsl(142 71% 45%))"
                        : e.conf >= 80
                          ? "linear-gradient(90deg, hsl(172 72% 48%), hsl(172 72% 60%))"
                          : "linear-gradient(90deg, hsl(26 100% 55%), hsl(26 100% 65%))",
                    }}
                  />
                </div>
                <span className="mono text-xs tabular shrink-0 w-12 text-right text-foreground">{e.conf}%</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
