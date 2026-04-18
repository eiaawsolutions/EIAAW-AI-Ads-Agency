"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
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
    const res = await apiFetch<{ ok: boolean; output?: Record<string, unknown>; error?: string }>(
      "/api/agents/ads-plan",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ objective, monthlyBudgetUsd, platforms, targetCpa, targetRoas, brandDna: dnaResult }),
      },
    );
    setLoading(false);

    if (!res.ok) {
      if (![429, 402, 401].includes(res.status) && res.status < 500) toast.error(res.error);
      return;
    }
    if (!res.data.ok) {
      toast.error(res.data.error ?? "Plan failed");
      return;
    }
    update({ planResult: res.data.output });
    toast.success("Strategy built");
  }

  return (
    <div>
      <span className="eyebrow">Step 02 · ads-plan</span>
      <h1 className="mt-3 display text-3xl md:text-4xl">Media strategy.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The Strategy Builder produces a channel mix, funnel weights, and KPI targets grounded in category benchmarks.
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <Label className="mb-2 block">Primary objective</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {OBJECTIVES.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => update({ objective: o.v as typeof objective })}
                className={`rounded-md border px-3 py-2.5 text-xs text-left transition-colors duration-150 ${
                  objective === o.v
                    ? "border-primary/60 bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border-strong"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            <Label htmlFor="cpa">Target CPA</Label>
            <Input
              id="cpa"
              type="number"
              placeholder="optional"
              value={targetCpa ?? ""}
              onChange={(e) => update({ targetCpa: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="roas">Target ROAS</Label>
            <Input
              id="roas"
              type="number"
              step="0.1"
              placeholder="optional"
              value={targetRoas ?? ""}
              onChange={(e) => update({ targetRoas: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Platforms</Label>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`mono text-xs rounded-md border px-3 py-2 transition-colors duration-150 ${
                  platforms.includes(p)
                    ? "border-primary/60 bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border-strong"
                }`}
              >
                {p.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={build} disabled={loading} variant="secondary">
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Building strategy
            </>
          ) : (
            "Build strategy"
          )}
        </Button>
      </div>

      {planResult && (
        <div className="mt-10 rounded-lg border border-border overflow-hidden fade-in">
          <div className="flex items-center justify-between px-5 py-3 hairline-b bg-surface-1">
            <span className="eyebrow">Proposed strategy</span>
            <span className="flex items-center gap-1.5 text-xs text-primary">
              <span className="status-dot" />
              ready
            </span>
          </div>
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            {(planResult as { funnel?: Record<string, number> }).funnel && (
              <div className="p-5">
                <span className="eyebrow">Funnel</span>
                <div className="mt-3 space-y-1.5">
                  {Object.entries((planResult as { funnel: Record<string, number> }).funnel).map(([k, v]) => (
                    <div key={k} className="flex justify-between mono text-xs tabular">
                      <span className="text-muted-foreground">{k.toUpperCase()}</span>
                      <span className="text-foreground">{Math.round(v * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(planResult as { allocation?: Record<string, number> }).allocation && (
              <div className="p-5">
                <span className="eyebrow">Allocation</span>
                <div className="mt-3 space-y-1.5">
                  {Object.entries((planResult as { allocation: Record<string, number> }).allocation).map(([k, v]) => (
                    <div key={k} className="flex justify-between mono text-xs tabular">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="text-foreground">{Math.round(v * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(planResult as { kpis?: Record<string, number> }).kpis && (
              <div className="p-5">
                <span className="eyebrow">KPI targets</span>
                <div className="mt-3 space-y-1.5">
                  {Object.entries((planResult as { kpis: Record<string, number> }).kpis).map(([k, v]) => (
                    <div key={k} className="flex justify-between mono text-xs tabular">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {(planResult as { rationale?: string }).rationale && (
            <div className="hairline-t px-5 py-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {(planResult as { rationale: string }).rationale}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("dna")}>
          <ArrowLeft /> Back
        </Button>
        <Button variant="secondary" disabled={!planResult} onClick={() => setStep("competitor")}>
          Continue <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
