"use client";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useWizard, type WizardLaunchOutcome } from "./wizard-store";

export function StepLaunch() {
  const {
    brandName,
    domain,
    platforms,
    monthlyBudget,
    currency,
    targetLocation,
    objective,
    planResult,
    setStep,
    update,
  } = useWizard();
  const [launching, setLaunching] = useState(false);

  async function launch() {
    setLaunching(true);
    try {
      const res = await fetch("/api/wizard/launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandName,
          domain,
          objective,
          monthlyBudget,
          currency,
          targetLocation,
          platforms,
          strategy: planResult,
        }),
      });
      const json = (await res.json()) as
        | ({ ok: true } & WizardLaunchOutcome)
        | { error: string };
      if (!res.ok || "error" in json) {
        const msg = "error" in json ? json.error : `Launch failed (${res.status})`;
        toast.error(msg);
        return;
      }
      const liveCount = json.results.filter((r) => r.state === "live").length;
      const blockedCount = json.results.filter(
        (r) => r.state === "requires_action" || r.state === "failed",
      ).length;
      if (blockedCount > 0 && liveCount === 0) {
        toast.success("Campaign saved — review platform actions on the next screen.");
      } else if (blockedCount > 0) {
        toast.success(`Live on ${liveCount} platform${liveCount === 1 ? "" : "s"} — ${blockedCount} need attention.`);
      } else {
        toast.success(`Campaign live on ${liveCount} platform${liveCount === 1 ? "" : "s"}.`);
      }
      update({
        launchOutcome: {
          campaignId: json.campaignId,
          campaignName: json.campaignName,
          rollupStatus: json.rollupStatus,
          results: json.results,
        },
      });
      setStep("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div>
      <span className="eyebrow">Step 05 · Review & launch</span>
      <h1 className="mt-3 display text-3xl md:text-4xl">Ready to go live.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We always create the campaign in your workspace. Per-platform status is shown next — including any actions you need to take to push the campaign onto each platform.
      </p>

      <div className="mt-8 rounded-lg border border-border overflow-hidden">
        {[
          ["Brand", brandName || "—"],
          ["Objective", objective],
          ["Target location", targetLocation || "—"],
          ["Monthly budget", `${currency} ${monthlyBudget.toLocaleString()}`],
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
