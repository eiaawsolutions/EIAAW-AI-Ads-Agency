"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
      <Badge>Step 04 · ads-math</Badge>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">Before you spend — the forecast.</h1>
      <p className="mt-2 text-muted-foreground">
        Three scenarios based on category benchmarks, your budget, and expected conversion behavior.
      </p>

      {loading || !scenarios ? (
        <div className="mt-10 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin" /> Running ads-math…
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((s) => (
            <Card key={s.label} className={`p-6 ${s.label === "Moderate" ? "glow border-brand-500/30" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="mono-tag">{s.label}</span>
                {s.label === "Moderate" && <Badge>Recommended</Badge>}
              </div>
              <div className="mt-6">
                <div className="mono-tag">Spend</div>
                <div className="text-2xl font-semibold">{formatCurrency(s.spend * 100)}</div>
              </div>
              <div className="mt-4">
                <div className="mono-tag">Projected revenue</div>
                <div className="text-3xl font-semibold text-gradient">{formatCurrency(s.revenue * 100)}</div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="mono-tag">ROAS</div>
                  <div className="mt-0.5 font-mono">{s.roas.toFixed(2)}×</div>
                </div>
                <div>
                  <div className="mono-tag">CPA</div>
                  <div className="mt-0.5 font-mono">${s.cpa.toFixed(2)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground max-w-2xl">
        * Forecast is based on industry benchmarks and your inputs. Actuals depend on creative quality,
        offer fit, seasonality, and platform auction dynamics. Not a performance guarantee.
      </p>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("competitor")}><ArrowLeft /> Back</Button>
        <Button variant="gradient" disabled={!scenarios} onClick={() => setStep("launch")}>
          Continue to launch <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
