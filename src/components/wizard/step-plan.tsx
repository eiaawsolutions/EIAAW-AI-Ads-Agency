"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useWizard } from "./wizard-store";

const OBJECTIVES = [
  { v: "SALES", l: "Online sales" },
  { v: "LEADS", l: "Lead generation" },
  { v: "APP_INSTALLS", l: "App installs" },
  { v: "TRAFFIC", l: "Website traffic" },
  { v: "AWARENESS", l: "Brand awareness" },
  { v: "ENGAGEMENT", l: "Engagement" },
];

const PLATFORMS = ["META", "GOOGLE", "TIKTOK", "LINKEDIN", "MICROSOFT", "YOUTUBE", "APPLE"];

export function StepPlan() {
  const { objective, monthlyBudgetUsd, platforms, targetCpa, targetRoas, planResult, update, setStep, dnaResult } = useWizard();
  const [loading, setLoading] = useState(false);

  function togglePlatform(p: string) {
    update({ platforms: platforms.includes(p) ? platforms.filter((x) => x !== p) : [...platforms, p] });
  }

  async function build() {
    if (platforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/agents/ads-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ objective, monthlyBudgetUsd, platforms, targetCpa, targetRoas, brandDna: dnaResult }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Plan failed");
      update({ planResult: data.output });
      toast.success("Strategy built");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Badge>Step 02 · ads-plan</Badge>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">Media strategy.</h1>
      <p className="mt-2 text-muted-foreground">
        The Strategy Builder agent produces a channel mix, funnel weights, and KPI targets grounded in category benchmarks.
      </p>

      <div className="mt-8 space-y-6">
        <div className="space-y-1.5">
          <Label>Primary objective</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {OBJECTIVES.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => update({ objective: o.v as typeof objective })}
                className={`rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                  objective === o.v
                    ? "border-brand-500 bg-brand-500/10 text-foreground"
                    : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="budget">Monthly budget (USD)</Label>
            <Input
              id="budget"
              type="number"
              min={500}
              value={monthlyBudgetUsd}
              onChange={(e) => update({ monthlyBudgetUsd: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cpa">Target CPA (optional)</Label>
            <Input id="cpa" type="number" value={targetCpa ?? ""} onChange={(e) => update({ targetCpa: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="roas">Target ROAS (optional)</Label>
            <Input id="roas" type="number" step="0.1" value={targetRoas ?? ""} onChange={(e) => update({ targetRoas: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Platforms</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`font-mono text-xs rounded-md border px-3 py-2 transition-colors ${
                  platforms.includes(p)
                    ? "border-brand-500 bg-brand-500/10 text-brand-200"
                    : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={build} disabled={loading} variant="gradient" size="lg">
          {loading ? <><Loader2 className="animate-spin" /> Building strategy…</> : "Build strategy"}
        </Button>
      </div>

      {planResult && (
        <Card className="mt-10 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Proposed strategy</h3>
            <Badge variant="live">Ready</Badge>
          </div>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
            {(planResult as { funnel?: Record<string, number> }).funnel && (
              <div>
                <span className="mono-tag">Funnel</span>
                <div className="mt-2 space-y-1.5 font-mono text-xs">
                  {Object.entries((planResult as { funnel: Record<string, number> }).funnel).map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span>{k.toUpperCase()}</span><span>{Math.round(v * 100)}%</span></div>
                  ))}
                </div>
              </div>
            )}
            {(planResult as { allocation?: Record<string, number> }).allocation && (
              <div>
                <span className="mono-tag">Allocation</span>
                <div className="mt-2 space-y-1.5 font-mono text-xs">
                  {Object.entries((planResult as { allocation: Record<string, number> }).allocation).map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span>{k}</span><span>{Math.round(v * 100)}%</span></div>
                  ))}
                </div>
              </div>
            )}
            {(planResult as { kpis?: Record<string, number> }).kpis && (
              <div>
                <span className="mono-tag">KPI targets</span>
                <div className="mt-2 space-y-1.5 font-mono text-xs">
                  {Object.entries((planResult as { kpis: Record<string, number> }).kpis).map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span>{k}</span><span>{v}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {(planResult as { rationale?: string }).rationale && (
            <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
              {(planResult as { rationale: string }).rationale}
            </p>
          )}
        </Card>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("dna")}><ArrowLeft /> Back</Button>
        <Button variant="gradient" disabled={!planResult} onClick={() => setStep("competitor")}>
          Continue <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
