"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const result = competitorResult as
    | {
        competitors?: { name: string; spendEstimate: string; topFormats: string[] }[];
        trends?: string[];
        gaps?: string[];
      }
    | undefined;

  return (
    <div>
      <span className="eyebrow">Step 03 · ads-competitor</span>
      <h1 className="mt-3 display text-3xl md:text-4xl">Who are we fighting?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Competitor Intel maps ad spend estimates, dominant creative formats, and whitespace where you can differentiate.
      </p>

      <Button onClick={scan} disabled={loading} variant="secondary" className="mt-8">
        {loading ? (
          <>
            <Loader2 className="animate-spin" /> Scanning
          </>
        ) : (
          "Run competitor scan"
        )}
      </Button>

      {result && (
        <div className="mt-10 space-y-4 fade-in">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 hairline-b bg-surface-1">
              <span className="eyebrow">Top competitors</span>
              <span className="mono text-xs text-muted-foreground">{result.competitors?.length ?? 0}</span>
            </div>
            {result.competitors?.map((c) => (
              <div key={c.name} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 hairline-t first:border-t-0">
                <div>
                  <div className="text-sm font-medium text-foreground">{c.name}</div>
                  <div className="mt-0.5 mono text-2xs text-muted-foreground">{c.topFormats.join(" · ")}</div>
                </div>
                <span className="mono text-xs text-primary tabular">{c.spendEstimate}</span>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-5 py-3 hairline-b bg-surface-1">
                <span className="eyebrow">Creative trends</span>
              </div>
              <ul className="p-5 space-y-2">
                {result.trends?.map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-foreground/90">
                    <span className="mono text-muted-foreground mt-0.5">→</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-5 py-3 hairline-b bg-surface-1">
                <span className="eyebrow">Whitespace</span>
              </div>
              <ul className="p-5 space-y-2">
                {result.gaps?.map((g) => (
                  <li key={g} className="flex items-start gap-2 text-sm text-foreground/90">
                    <span className="text-primary mt-0.5">✦</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("plan")}>
          <ArrowLeft /> Back
        </Button>
        <Button variant="secondary" disabled={!result} onClick={() => setStep("forecast")}>
          Continue <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
