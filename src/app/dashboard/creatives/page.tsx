import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const metadata = { title: "Creatives" };

const CREATIVES = Array.from({ length: 12 }).map((_, i) => ({
  id: `cr_${400 + i}`,
  style: (["Studio", "Floating", "Lifestyle", "UGC"] as const)[i % 4],
  roas: Number((1.8 + Math.random() * 3).toFixed(2)),
  freq: Number((1.2 + Math.random() * 2).toFixed(1)),
}));

export default function CreativesPage() {
  return (
    <>
      <DashboardTopbar title="Creatives" subtitle="ads-generate · ads-photoshoot · 5 styles per product" />
      <main className="p-6 space-y-6">
        <div className="flex justify-end">
          <Button variant="secondary"><Sparkles className="h-3.5 w-3.5" /> Generate batch</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CREATIVES.map((c) => (
            <div key={c.id} className="rounded-lg border border-border overflow-hidden group bg-card">
              <div className="aspect-square bg-surface-2 relative overflow-hidden">
                <div
                  className="absolute inset-0 transition-transform duration-250 group-hover:scale-[1.02]"
                  style={{
                    background: [
                      "radial-gradient(ellipse at 30% 20%, hsl(174 62% 40% / 0.38), transparent 60%)",
                      "radial-gradient(ellipse at 80% 70%, hsl(26 80% 60% / 0.28), transparent 55%)",
                      "linear-gradient(135deg, hsl(36 32% 93%), hsl(34 26% 89%))",
                    ].join(","),
                  }}
                />
                <div className="absolute top-2 right-2">
                  <Badge variant={c.freq > 2.5 ? "warn" : "outline"}>{c.style}</Badge>
                </div>
              </div>
              <div className="px-3 py-2.5 hairline-t">
                <div className="flex items-center justify-between">
                  <span className="mono text-2xs text-muted-foreground">{c.id}</span>
                  <span className="mono text-xs text-primary tabular">{c.roas.toFixed(2)}×</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-2xs text-muted-foreground">Frequency</span>
                  <span className={`mono text-2xs tabular ${c.freq > 2.5 ? "text-amber-400" : "text-muted-foreground"}`}>
                    {c.freq.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
