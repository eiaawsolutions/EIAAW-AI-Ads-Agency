"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useWizard } from "./wizard-store";

export function StepCompetitor() {
  const { brandName, competitorResult, update, setStep } = useWizard();
  const [loading, setLoading] = useState(false);

  async function scan() {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/ads-competitor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brand: brandName, market: "US" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      update({ competitorResult: data.output });
      toast.success("Competitor scan complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const result = competitorResult as { competitors?: { name: string; spendEstimate: string; topFormats: string[] }[]; trends?: string[]; gaps?: string[] } | undefined;

  return (
    <div>
      <Badge>Step 03 · ads-competitor</Badge>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">Who are we fighting?</h1>
      <p className="mt-2 text-muted-foreground">
        Competitor Intel maps ad spend estimates, dominant creative formats, and whitespace where you can differentiate.
      </p>

      <Button onClick={scan} disabled={loading} variant="gradient" size="lg" className="mt-8">
        {loading ? <><Loader2 className="animate-spin" /> Scanning…</> : "Run competitor scan"}
      </Button>

      {result && (
        <div className="mt-10 space-y-5">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Top competitors</h3>
              <Badge variant="live">Ready</Badge>
            </div>
            <div className="mt-5 space-y-3">
              {result.competitors?.map((c) => (
                <div key={c.name} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{c.topFormats.join(" · ")}</div>
                  </div>
                  <div className="font-mono text-xs text-brand-300">{c.spendEstimate}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-sm font-semibold">Creative trends</h3>
              <ul className="mt-4 space-y-2 text-sm text-foreground/85">
                {result.trends?.map((t) => <li key={t} className="flex gap-2"><span className="text-brand-400">→</span>{t}</li>)}
              </ul>
            </Card>
            <Card className="p-6 border-brand-500/20">
              <h3 className="text-sm font-semibold">Whitespace for {brandName || "you"}</h3>
              <ul className="mt-4 space-y-2 text-sm text-foreground/85">
                {result.gaps?.map((g) => <li key={g} className="flex gap-2"><span className="text-brand-400">✦</span>{g}</li>)}
              </ul>
            </Card>
          </div>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("plan")}><ArrowLeft /> Back</Button>
        <Button variant="gradient" disabled={!result} onClick={() => setStep("forecast")}>
          Continue <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
