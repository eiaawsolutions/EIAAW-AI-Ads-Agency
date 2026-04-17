"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useWizard } from "./wizard-store";

type Scenario = { label: string; spend: number; revenue: number; roas: number; cpa: number };

export function StepForecast() {
  const { monthlyBudgetUsd, forecastResult, update, setStep } = useWizard();
  const [loading, setLoading] = useState(false);

  async function forecast() {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/ads-math", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ monthlyBudgetUsd }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      update({ forecastResult: data.output });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!forecastResult) forecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scenarios = (forecastResult as { scenarios?: Scenario[] } | undefined)?.scenarios;

  return (
    <div>
      <span className="eyebrow">Step 04 · ads-math</span>
      <h1 className="mt-3 display text-3xl md:text-4xl">Before you spend — the forecast.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Three scenarios based on category benchmarks, your budget, and expected conversion behavior.
      </p>

      {loading || !scenarios ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Running ads-math
        </div>
      ) : (
        <div className="mt-10 rounded-lg border border-border overflow-hidden fade-in">
          <div className="grid grid-cols-[120px_1fr_1fr_100px_100px] px-5 py-3 hairline-b bg-surface-1">
            <span className="eyebrow">Scenario</span>
            <span className="eyebrow">Spend</span>
            <span className="eyebrow">Revenue</span>
            <span className="eyebrow text-right">ROAS</span>
            <span className="eyebrow text-right">CPA</span>
          </div>
          {scenarios.map((s) => (
            <div
              key={s.label}
              className={`grid grid-cols-[120px_1fr_1fr_100px_100px] items-center px-5 py-4 hairline-t first:border-t-0 ${s.label === "Moderate" ? "bg-primary/5" : ""}`}
            >
              <span className="text-sm font-medium text-foreground">{s.label}</span>
              <span className="mono text-sm text-foreground tabular">{formatCurrency(s.spend * 100)}</span>
              <span className="mono text-sm text-primary tabular">{formatCurrency(s.revenue * 100)}</span>
              <span className="mono text-sm text-foreground tabular text-right">{s.roas.toFixed(2)}×</span>
              <span className="mono text-sm text-foreground tabular text-right">${s.cpa.toFixed(0)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-2xs text-muted-foreground max-w-xl leading-relaxed">
        Forecast is based on industry benchmarks and your inputs. Actuals depend on creative quality, offer fit,
        seasonality, and platform auction dynamics. Not a performance guarantee.
      </p>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("competitor")}>
          <ArrowLeft /> Back
        </Button>
        <Button variant="secondary" disabled={!scenarios} onClick={() => setStep("launch")}>
          Continue <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
