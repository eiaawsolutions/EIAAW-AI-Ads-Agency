"use client";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "./wizard-store";
import { PlatformStatusRow } from "@/components/campaigns/platform-status-row";

export function StepDone() {
  const reset = useWizard((s) => s.reset);
  const outcome = useWizard((s) => s.launchOutcome);

  const liveCount = outcome?.results.filter((r) => r.state === "live").length ?? 0;
  const blockedCount =
    outcome?.results.filter((r) => r.state === "requires_action" || r.state === "failed").length ?? 0;

  const headline =
    !outcome
      ? "running."
      : blockedCount > 0 && liveCount === 0
        ? "ready — finish setup."
        : blockedCount > 0
          ? "partially live."
          : "running.";

  return (
    <div>
      <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/5">
        <Check className="h-6 w-6 text-primary" />
      </div>
      <span className="eyebrow">Campaign created</span>
      <h1 className="mt-3 display text-4xl md:text-5xl text-balance">
        {outcome?.campaignName ?? "Your AI team is"}
        <br />
        <span className="text-muted-foreground">{headline}</span>
      </h1>
      <p className="mt-4 text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
        {outcome
          ? "The campaign is saved to your workspace. Per-platform status below — anything marked ‘action required’ needs you to complete the linked step."
          : "Brand DNA, strategy, and competitor intel are saved to your workspace."}
      </p>

      {outcome && outcome.results.length > 0 && (
        <div className="mt-8 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Per-platform status</span>
            <span className="text-2xs mono text-muted-foreground">
              {liveCount} live · {blockedCount > 0 ? `${blockedCount} need attention · ` : ""}
              {outcome.results.length} total
            </span>
          </div>
          {outcome.results.map((r) => (
            <PlatformStatusRow
              key={r.platform}
              platform={r.platform}
              state={r.state}
              externalCampaignId={r.externalCampaignId}
              reason={r.reason}
              remediation={r.remediation}
              adapterMode={r.adapterMode}
            />
          ))}
        </div>
      )}

      <div className="mt-10 flex items-center justify-center gap-2">
        <Button asChild variant="secondary" size="lg">
          <Link href={outcome ? `/dashboard/campaigns/${outcome.campaignId}` : "/dashboard"}>
            {outcome ? "Open campaign →" : "Continue on dashboard →"}
          </Link>
        </Button>
        <Button variant="ghost" size="lg" onClick={reset}>
          Restart wizard
        </Button>
      </div>
    </div>
  );
}
