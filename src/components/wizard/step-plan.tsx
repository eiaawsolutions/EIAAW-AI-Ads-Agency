"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useWizard } from "./wizard-store";
import {
  MIN_MONTHLY_BUDGET_USD,
  MIN_DAILY_BUDGET_USD,
  checkMonthlyBudget,
} from "@/lib/budget-floor";

const OBJECTIVES = [
  { v: "SALES", l: "Online sales" },
  { v: "LEADS", l: "Lead generation" },
  { v: "APP_INSTALLS", l: "App installs" },
  { v: "TRAFFIC", l: "Website traffic" },
  { v: "AWARENESS", l: "Brand awareness" },
  { v: "ENGAGEMENT", l: "Engagement" },
];

const PLATFORMS = ["META", "GOOGLE", "TIKTOK", "LINKEDIN", "MICROSOFT", "YOUTUBE", "APPLE"];

const LOCATION_PRESETS = [
  "Worldwide",
  "United States",
  "Canada",
  "United Kingdom",
  "European Union",
  "Australia",
  "Singapore",
  "Malaysia",
  "Indonesia",
  "United Arab Emirates",
  "India",
  "Japan",
];

const CURRENCIES = [
  { v: "USD", l: "USD · US Dollar" },
  { v: "EUR", l: "EUR · Euro" },
  { v: "GBP", l: "GBP · British Pound" },
  { v: "CAD", l: "CAD · Canadian Dollar" },
  { v: "AUD", l: "AUD · Australian Dollar" },
  { v: "SGD", l: "SGD · Singapore Dollar" },
  { v: "MYR", l: "MYR · Malaysian Ringgit" },
  { v: "IDR", l: "IDR · Indonesian Rupiah" },
  { v: "AED", l: "AED · UAE Dirham" },
  { v: "INR", l: "INR · Indian Rupee" },
  { v: "JPY", l: "JPY · Japanese Yen" },
];

export function StepPlan() {
  const {
    objective,
    monthlyBudget,
    platforms,
    targetCpa,
    targetRoas,
    targetLocation,
    currency,
    planResult,
    update,
    setStep,
    dnaResult,
  } = useWizard();
  const [loading, setLoading] = useState(false);

  function togglePlatform(p: string) {
    update({ platforms: platforms.includes(p) ? platforms.filter((x) => x !== p) : [...platforms, p] });
  }

  const budgetCheck = checkMonthlyBudget(monthlyBudget, currency);

  async function build() {
    if (platforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    if (!targetLocation.trim()) {
      toast.error("Enter a target location");
      return;
    }
    if (!budgetCheck.ok) {
      toast.error(budgetCheck.reason);
      return;
    }
    setLoading(true);
    const res = await apiFetch<{ ok: boolean; output?: Record<string, unknown>; error?: string }>(
      "/api/agents/ads-plan",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          objective,
          monthlyBudget,
          platforms,
          targetCpa,
          targetRoas,
          targetLocation: targetLocation.trim(),
          currency,
          brandDna: dnaResult,
        }),
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="location">Target location</Label>
            <Input
              id="location"
              type="text"
              list="location-presets"
              placeholder="e.g. United States, Klang Valley, DACH"
              value={targetLocation}
              onChange={(e) => update({ targetLocation: e.target.value })}
            />
            <datalist id="location-presets">
              {LOCATION_PRESETS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <div className="flex flex-wrap gap-1">
              {LOCATION_PRESETS.slice(0, 6).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update({ targetLocation: p })}
                  className={`mono text-[10px] rounded-md border px-2 py-1 transition-colors duration-150 ${
                    targetLocation === p
                      ? "border-primary/60 bg-primary/5 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border-strong"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => update({ currency: e.target.value })}
              className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CURRENCIES.map((c) => (
                <option key={c.v} value={c.v}>
                  {c.l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="budget">Monthly budget ({currency})</Label>
            <Input
              id="budget"
              type="number"
              min={MIN_MONTHLY_BUDGET_USD}
              step={10}
              value={monthlyBudget}
              onChange={(e) => update({ monthlyBudget: Number(e.target.value) })}
              className={!budgetCheck.ok ? "border-coral-500 focus-visible:ring-coral-500" : undefined}
              aria-invalid={!budgetCheck.ok}
              aria-describedby="budget-help"
            />
            <p
              id="budget-help"
              className={`text-2xs ${budgetCheck.ok ? "text-muted-foreground" : "text-coral-600"}`}
            >
              {budgetCheck.ok
                ? `Min ${currency} ${MIN_MONTHLY_BUDGET_USD}/mo (≈ ${currency} ${MIN_DAILY_BUDGET_USD}/day) — Meta and other platforms reject lower amounts.`
                : budgetCheck.reason}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cpa">Target CPA ({currency})</Label>
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

        <Button onClick={build} disabled={loading || !budgetCheck.ok} variant="secondary">
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
