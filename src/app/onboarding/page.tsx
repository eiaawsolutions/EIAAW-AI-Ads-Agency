"use client";

import { useWizard, STEPS } from "@/components/wizard/wizard-store";
import { StepWelcome } from "@/components/wizard/step-welcome";
import { StepDna } from "@/components/wizard/step-dna";
import { StepPlan } from "@/components/wizard/step-plan";
import { StepCompetitor } from "@/components/wizard/step-competitor";
import { StepForecast } from "@/components/wizard/step-forecast";
import { StepLaunch } from "@/components/wizard/step-launch";
import { StepDone } from "@/components/wizard/step-done";
import { Check } from "lucide-react";

export default function OnboardingPage() {
  const step = useWizard((s) => s.step);
  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const isTerminal = step === "welcome" || step === "done";

  return (
    <div className="min-h-[calc(100vh-56px)] grid lg:grid-cols-[240px_1fr]">
      {/* Step rail */}
      {!isTerminal && (
        <aside className="hairline-r bg-surface-1/40 px-6 py-12 hidden lg:block">
          <span className="eyebrow">Onboarding</span>
          <div className="mt-8 space-y-0.5">
            {STEPS.slice(1, -1).map((s, i) => {
              const idx = i + 1;
              const done = idx < currentIdx;
              const active = idx === currentIdx;
              return (
                <div
                  key={s.key}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
                    active ? "bg-surface-1 text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-2xs mono tabular transition-colors duration-150 ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : active
                          ? "border-primary text-primary"
                          : "border-border"
                    }`}
                  >
                    {done ? <Check className="h-3 w-3" /> : String(idx).padStart(2, "0")}
                  </div>
                  {s.label}
                </div>
              );
            })}
          </div>

          <div className="mt-12 rounded-md border border-border bg-background p-4">
            <span className="eyebrow">Tip</span>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              You can pause and resume anywhere. Everything saves as you go.
            </p>
          </div>
        </aside>
      )}

      {/* Step content */}
      <main className={`px-6 py-12 lg:py-16 ${isTerminal ? "lg:col-span-2" : ""}`}>
        <div className={`mx-auto ${isTerminal ? "max-w-3xl text-center" : "max-w-2xl"} fade-in`}>
          {step === "welcome" && <StepWelcome />}
          {step === "dna" && <StepDna />}
          {step === "plan" && <StepPlan />}
          {step === "competitor" && <StepCompetitor />}
          {step === "forecast" && <StepForecast />}
          {step === "launch" && <StepLaunch />}
          {step === "done" && <StepDone />}
        </div>
      </main>
    </div>
  );
}
