import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata = { title: "Experiments" };

const EXPERIMENTS = [
  { name: "Headline: benefit vs. proof", kind: "headline", status: "running", conf: 86, platform: "Meta", variants: ["A: Benefit", "B: Proof"] },
  { name: "CTA: Shop now vs. Try risk-free", kind: "cta", status: "running", conf: 62, platform: "Google", variants: ["A: Shop now", "B: Try risk-free"] },
  { name: "Audience: LAL 1% vs 3%", kind: "audience", status: "running", conf: 44, platform: "TikTok", variants: ["A: 1%", "B: 3%"] },
  { name: "Creative: UGC vs. studio", kind: "creative", status: "completed", conf: 98, platform: "Meta", variants: ["A: UGC", "B: Studio"] },
];

export default function ExperimentsPage() {
  return (
    <>
      <DashboardTopbar title="Experiments" subtitle="ads-test · closed-loop learning" />
      <main className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Running & recent</h2>
            <p className="text-xs text-muted-foreground">Every creative ships inside a designed experiment.</p>
          </div>
          <Button variant="gradient"><Plus /> New experiment</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXPERIMENTS.map((e) => (
            <Card key={e.name} className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={e.status === "running" ? "live" : "default"}>{e.status}</Badge>
                <span className="font-mono text-[10px] text-muted-foreground">{e.platform} · {e.kind}</span>
              </div>
              <h3 className="text-base font-semibold">{e.name}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {e.variants.map((v) => (
                  <span key={v} className="font-mono text-[11px] px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5 text-brand-200">
                    {v}
                  </span>
                ))}
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="mono-tag">Confidence</span>
                  <span className="font-mono text-xs text-brand-300">{e.conf}%</span>
                </div>
                <Progress value={e.conf} />
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
