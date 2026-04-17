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
      <Badge>Step 01 · ads-dna</Badge>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance">Tell us about your brand.</h1>
      <p className="mt-2 text-muted-foreground">
        The Brand DNA agent extracts voice, audience, palette, and positioning. The more context, the sharper the output.
      </p>

      <div className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="brandName">Brand name *</Label>
          <Input id="brandName" placeholder="Aurora Skincare" value={brandName} onChange={(e) => update({ brandName: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="domain">Website</Label>
          <Input id="domain" type="url" placeholder="https://aurora.example.com" value={domain} onChange={(e) => update({ domain: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Anything we should know? (optional)</Label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Target market, hero products, seasonal priorities…"
            className="flex w-full rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
            value={dnaNotes}
            onChange={(e) => update({ dnaNotes: e.target.value })}
          />
        </div>

        <Button onClick={extract} disabled={loading} variant="gradient" size="lg">
          {loading ? <><Loader2 className="animate-spin" /> Extracting…</> : "Extract Brand DNA"}
        </Button>
      </div>

      {dnaResult && (
        <Card className="mt-10 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Extracted DNA</h3>
            <Badge variant="live">Ready</Badge>
          </div>
          <dl className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            {Object.entries(dnaResult).slice(0, 8).map(([k, v]) => (
              <div key={k}>
                <dt className="mono-tag">{k}</dt>
                <dd className="mt-1 text-foreground/85">
                  {typeof v === "string" ? v : JSON.stringify(v, null, 2).slice(0, 180)}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("welcome")}><ArrowLeft /> Back</Button>
        <Button variant="gradient" disabled={!dnaResult} onClick={() => setStep("plan")}>
          Continue to strategy <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
