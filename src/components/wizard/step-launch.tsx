"use client";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useWizard } from "./wizard-store";

export function StepLaunch() {
  const { brandName, platforms, monthlyBudgetUsd, objective, setStep } = useWizard();
  const [launching, setLaunching] = useState(false);

  async function launch() {
    setLaunching(true);
    try {
      for (const _p of platforms) {
        await new Promise((r) => setTimeout(r, 550));
      }
      toast.success(`Campaign launched on ${platforms.length} platforms`);
      setStep("done");
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div>
      <span className="eyebrow">Step 05 · Review & launch</span>
      <h1 className="mt-3 display text-3xl md:text-4xl">Ready to go live.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Final review. One click launches across every selected platform simultaneously.
      </p>

      <div className="mt-8 rounded-lg border border-border overflow-hidden">
        {[
          ["Brand", brandName || "—"],
          ["Objective", objective],
          ["Monthly budget", `$${monthlyBudgetUsd.toLocaleString()}`],
          ["Platforms", platforms.map((p) => p.toLowerCase()).join(" · ")],
        ].map(([k, v], i) => (
          <div key={k} className={`grid grid-cols-[180px_1fr] px-5 py-3.5 ${i > 0 ? "hairline-t" : ""}`}>
            <span className="eyebrow">{k}</span>
            <span className={k === "Platforms" || k === "Objective" ? "mono text-sm text-foreground" : "text-sm text-foreground"}>
              {v}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border p-5">
        <span className="eyebrow">Agents that will run continuously</span>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["ads-audit", "ads-creative", "ads-test", "ads-math", "ads-budget", "ads-landing"].map((a) => (
            <span key={a} className="mono text-xs px-2 py-1 rounded-md border border-border bg-surface-1 text-foreground">
              {a}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("forecast")}>
          <ArrowLeft /> Back
        </Button>
        <Button variant="secondary" size="lg" onClick={launch} disabled={launching}>
          {launching ? (
            <>
              <Loader2 className="animate-spin" /> Launching
            </>
          ) : (
            `Launch across ${platforms.length} platforms`
          )}
        </Button>
      </div>
    </div>
  );
}
