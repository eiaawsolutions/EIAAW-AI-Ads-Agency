"use client";
import { useState } from "react";
import { ArrowLeft, Rocket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useWizard } from "./wizard-store";

export function StepLaunch() {
  const { brandName, platforms, monthlyBudgetUsd, objective, setStep } = useWizard();
  const [launching, setLaunching] = useState(false);

  async function launch() {
    setLaunching(true);
    try {
      // Simulate sequential platform launches.
      for (const _p of platforms) {
        await new Promise((r) => setTimeout(r, 550));
      }
      toast.success("Campaign launched on " + platforms.length + " platforms");
      setStep("done");
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div>
      <Badge>Step 05 · Review & launch</Badge>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">Ready to go live.</h1>
      <p className="mt-2 text-muted-foreground">
        Final review. One click launches across every selected platform simultaneously.
      </p>

      <Card className="mt-8 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="mono-tag">Brand</div>
            <div className="mt-1 font-semibold">{brandName || "—"}</div>
          </div>
          <div>
            <div className="mono-tag">Objective</div>
            <div className="mt-1 font-mono text-sm">{objective}</div>
          </div>
          <div>
            <div className="mono-tag">Monthly budget</div>
            <div className="mt-1 font-semibold">${monthlyBudgetUsd.toLocaleString()}</div>
          </div>
          <div>
            <div className="mono-tag">Platforms</div>
            <div className="mt-1 font-mono text-xs text-brand-300">{platforms.join(" · ")}</div>
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-6">
        <h3 className="text-sm font-semibold">Agents that will run continuously</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {["ads-audit", "ads-creative", "ads-test", "ads-math", "ads-budget", "ads-landing"].map((a) => (
            <span key={a} className="font-mono text-xs px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-white/5 text-brand-200">
              {a}
            </span>
          ))}
        </div>
      </Card>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("forecast")}><ArrowLeft /> Back</Button>
        <Button variant="gradient" size="lg" onClick={launch} disabled={launching}>
          {launching ? <><Loader2 className="animate-spin" /> Launching…</> : <><Rocket /> Launch across {platforms.length} platforms</>}
        </Button>
      </div>
    </div>
  );
}
