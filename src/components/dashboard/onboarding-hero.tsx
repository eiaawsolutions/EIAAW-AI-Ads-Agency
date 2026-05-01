import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Milestone, SetupStatus } from "@/lib/setup-status";
import { OnboardingAutopilotButton } from "./onboarding-autopilot-button";

/**
 * Dashboard onboarding hero. Renders the celebration of completed AI work
 * and pulls the user toward the next milestone with a single Autopilot CTA
 * (system runs the next step) or a Guide-me CTA (user clicks through with
 * agent assistance). Hidden once allDone.
 */
export function OnboardingHero({ status, orgName }: { status: SetupStatus; orgName: string }) {
  if (status.allDone) return null;

  const next = status.milestones[status.nextIndex];
  const completed = status.milestones.filter((m) => m.done);
  const totalCount = status.milestones.length;

  return (
    <section className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="px-6 py-5 hairline-b bg-surface-1/40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="eyebrow inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              Welcome, {orgName}
            </span>
            <h2 className="mt-2 display text-xl md:text-2xl">
              {completed.length === 0
                ? "Let's get your AI ad team to first results."
                : completed.length < totalCount - 1
                  ? "You're moving fast — one milestone at a time."
                  : "Almost there. One last step to unlock live optimization."}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {completed.length} of {totalCount} milestones complete
            </p>
          </div>
        </div>
      </div>

      {/* Completed milestones with proof */}
      {completed.length > 0 && (
        <ul className="divide-y divide-border">
          {completed.map((m) => (
            <li key={m.key} className="grid grid-cols-[28px_180px_1fr] items-center gap-4 px-6 py-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="h-3 w-3" />
              </span>
              <span className="text-sm font-medium text-foreground">{m.title}</span>
              <span className="mono text-xs text-muted-foreground truncate">{m.proof ?? ""}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Next milestone — the action panel */}
      {next && <NextMilestoneAction milestone={next} hasIntegration={status.hasIntegration} />}
    </section>
  );
}

function NextMilestoneAction({
  milestone,
  hasIntegration,
}: {
  milestone: Milestone;
  hasIntegration: boolean;
}) {
  const copy = milestoneCopy(milestone.key);

  return (
    <div className="px-6 py-5 bg-surface-1/30 hairline-t">
      <div className="grid grid-cols-[28px_1fr] items-start gap-4">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 bg-primary/5 mt-0.5">
          <span className="status-dot bg-primary" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span className="text-sm font-medium text-foreground">{copy.title}</span>
            <span className="mono text-2xs text-muted-foreground">~{copy.estTime}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xl">
            {copy.description}
          </p>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {/* Autopilot — system runs it for the user */}
            {milestone.key === "audit" && hasIntegration && (
              <OnboardingAutopilotButton milestoneKey="audit" />
            )}

            {/* Integration milestone has no fully-automatic path (OAuth needs human),
                but Autopilot still opens the integrations picker as a one-click route. */}
            {milestone.key === "integration" && (
              <Button asChild variant="secondary" size="default">
                <Link href="/dashboard/integrations">{copy.autopilotLabel}</Link>
              </Button>
            )}

            {/* dna/plan/competitor — autopilot route is "go run the wizard". */}
            {(milestone.key === "dna" || milestone.key === "plan" || milestone.key === "competitor") && (
              <Button asChild variant="secondary" size="default">
                <Link href="/onboarding">{copy.autopilotLabel}</Link>
              </Button>
            )}

            {/* Guide-me — the gentler path that walks them through */}
            <Button asChild variant="ghost" size="default">
              <Link href={copy.guideHref}>{copy.guideLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type MilestoneCopy = {
  title: string;
  description: string;
  estTime: string;
  autopilotLabel: string;
  guideLabel: string;
  guideHref: string;
};

function milestoneCopy(key: Milestone["key"]): MilestoneCopy {
  switch (key) {
    case "dna":
      return {
        title: "Extract your brand DNA",
        description:
          "The Brand DNA agent reads your site and extracts voice, audience, palette, and positioning — the spine every other agent will use.",
        estTime: "30 sec",
        autopilotLabel: "Run on autopilot",
        guideLabel: "Guide me",
        guideHref: "/onboarding",
      };
    case "plan":
      return {
        title: "Build your media strategy",
        description:
          "The Strategy Builder uses your Brand DNA to recommend a channel mix, funnel weights, KPI targets, and a 12-week rollout grounded in category benchmarks.",
        estTime: "60 sec",
        autopilotLabel: "Run on autopilot",
        guideLabel: "Guide me",
        guideHref: "/onboarding",
      };
    case "competitor":
      return {
        title: "Map your competitive whitespace",
        description:
          "Competitor Intel surfaces ad spend estimates, dominant formats, and the whitespace where you can differentiate. Pulled from public ad-library signals.",
        estTime: "45 sec",
        autopilotLabel: "Run on autopilot",
        guideLabel: "Guide me",
        guideHref: "/onboarding",
      };
    case "integration":
      return {
        title: "Connect your first ad platform",
        description:
          "Once a platform is connected, agents can audit live performance, score creative fatigue, and propose optimizations from real data — not just inputs you typed.",
        estTime: "2 min",
        autopilotLabel: "Pick a platform →",
        guideLabel: "What gets connected?",
        guideHref: "/dashboard/docs",
      };
    case "audit":
      return {
        title: "Run your first performance audit",
        description:
          "The audit agent scores your account 0-100 across tracking, account structure, creative fatigue, bids, audience overlap, and wasted spend. Findings are P0-P3 actionable.",
        estTime: "3 min",
        autopilotLabel: "Run audit now",
        guideLabel: "What does it check?",
        guideHref: "/dashboard/audit",
      };
  }
}
