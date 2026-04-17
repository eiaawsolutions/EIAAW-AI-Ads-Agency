"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useWizard } from "./wizard-store";

export function StepDna() {
  const { brandName, domain, dnaNotes, dnaResult, update, setStep } = useWizard();
  const [loading, setLoading] = useState(false);

  async function extract() {
    if (!brandName.trim()) {
      toast.error("Brand name required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/agents/ads-dna", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandName, domain: domain || undefined, notes: dnaNotes || undefined }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "DNA extraction failed");
      update({ dnaResult: data.output });
      toast.success("Brand DNA extracted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <span className="eyebrow">Step 01 · ads-dna</span>
      <h1 className="mt-3 display text-3xl md:text-4xl">Tell us about your brand.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The Brand DNA agent extracts voice, audience, palette, and positioning. The more context, the sharper the output.
      </p>

      <div className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="brandName">Brand name</Label>
          <Input
            id="brandName"
            placeholder="Aurora Skincare"
            value={brandName}
            onChange={(e) => update({ brandName: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="domain">Website</Label>
          <Input
            id="domain"
            type="url"
            placeholder="https://aurora.example.com"
            value={domain}
            onChange={(e) => update({ domain: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Anything we should know?</Label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Target market, hero products, seasonal priorities…"
            className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20"
            value={dnaNotes}
            onChange={(e) => update({ dnaNotes: e.target.value })}
          />
        </div>

        <Button onClick={extract} disabled={loading} variant="secondary">
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Extracting
            </>
          ) : (
            "Extract brand DNA"
          )}
        </Button>
      </div>

      {dnaResult && (
        <div className="mt-10 rounded-lg border border-border overflow-hidden fade-in">
          <div className="flex items-center justify-between px-5 py-3 hairline-b bg-surface-1">
            <span className="eyebrow">Extracted DNA</span>
            <span className="flex items-center gap-1.5 text-xs text-primary">
              <span className="status-dot" />
              ready
            </span>
          </div>
          <dl className="divide-y divide-border">
            {Object.entries(dnaResult).slice(0, 6).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[140px_1fr] gap-4 px-5 py-3">
                <dt className="mono text-xs text-muted-foreground">{k}</dt>
                <dd className="text-xs text-foreground/90 leading-relaxed truncate">
                  {typeof v === "string" ? v : JSON.stringify(v).slice(0, 180)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("welcome")}>
          <ArrowLeft /> Back
        </Button>
        <Button variant="secondary" disabled={!dnaResult} onClick={() => setStep("plan")}>
          Continue <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
