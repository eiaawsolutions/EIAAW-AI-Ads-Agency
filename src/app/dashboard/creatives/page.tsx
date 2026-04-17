import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const metadata = { title: "Creatives" };

const CREATIVES = Array.from({ length: 8 }).map((_, i) => ({
  id: `cr_${400 + i}`,
  style: ["Studio", "Floating", "Lifestyle", "UGC"][i % 4],
  roas: Number((1.8 + Math.random() * 3).toFixed(2)),
  freq: Number((1.2 + Math.random() * 2).toFixed(1)),
}));

export default function CreativesPage() {
  return (
    <>
      <DashboardTopbar title="Creatives" subtitle="ads-generate · ads-photoshoot · 5 styles per product" />
      <main className="p-8 space-y-6">
        <div className="flex justify-end">
          <Button variant="gradient"><Sparkles /> Generate new batch</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CREATIVES.map((c) => (
            <Card key={c.id} className="p-0 overflow-hidden">
              <div
                className="aspect-square"
                style={{ background: `linear-gradient(135deg, #083C3C, #14B39B, #8FEBDD)` }}
              />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-brand-300">{c.id}</span>
                  <Badge variant={c.freq > 2.5 ? "warn" : "outline"}>{c.style}</Badge>
                </div>
                <div className="mt-3 flex justify-between font-mono text-[11px]">
                  <span>ROAS {c.roas.toFixed(2)}×</span>
                  <span className={c.freq > 2.5 ? "text-amber-300" : "text-muted-foreground"}>freq {c.freq.toFixed(1)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
