"use client";

import { useWizard, STEPS } from "@/components/wizard/wizard-store";
import { StepWelcome } from "@/components/wizard/step-welcome";
import { StepDna } from "@/components/wizard/step-dna";
import { StepPlan } from "@/components/wizard/step-plan";
import { StepCompetitor } from "@/components/wizard/step-competitor";
import { StepForecast } from "@/components/wizard/step-forecast";
import { StepLaunch } from "@/components/wizard/step-launch";
import { StepDone } from "@/components/wizard/step-done";

export default function OnboardingPage() {
  const step = useWizard((s) => s.step);
  const currentIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <main className="container py-12 md:py-20">
      {/* Progress rail */}
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3 flex-1">
              <div
                className={`h-7 w-7 shrink-0 rounded-full border grid place-items-center text-[11px] font-mono transition-colors
                  ${i < currentIdx ? "border-brand-500 bg-brand-500 text-ink-950" :
                    i === currentIdx ? "border-brand-500 text-brand-300" :
                    "border-white/10 text-muted-foreground"}`}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 transition-colors ${i < currentIdx ? "bg-brand-500" : "bg-white/5"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between">
          {STEPS.map((s, i) => (
            <span key={s.key} className={`text-[10px] uppercase tracking-[0.14em] ${i === currentIdx ? "text-brand-300" : "text-muted-foreground"}`}>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl mt-14 animate-fade-up">
        {step === "welcome" && <StepWelcome />}
        {step === "dna" && <StepDna />}
        {step === "plan" && <StepPlan />}
        {step === "competitor" && <StepCompetitor />}
        {step === "forecast" && <StepForecast />}
        {step === "launch" && <StepLaunch />}
        {step === "done" && <StepDone />}
      </div>
    </main>
  );
}
