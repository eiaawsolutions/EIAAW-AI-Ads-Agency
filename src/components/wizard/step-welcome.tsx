"use client";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "./wizard-store";

const STEPS = [
  ["01", "Brand DNA",        "Voice, audience, palette, positioning"],
  ["02", "Strategy",         "Channel mix, funnel weights, KPIs"],
  ["03", "Competitor intel", "Spend, formats, whitespace"],
  ["04", "Forecast",         "Three scenarios before you spend"],
  ["05", "Creative",         "Concepts and copy per platform"],
  ["06", "Launch",           "Seven platforms, one click"],
];

export function StepWelcome() {
  const setStep = useWizard((s) => s.setStep);
  return (
    <div>
      <span className="eyebrow">Onboarding · 15 minutes</span>
      <h1 className="mt-4 display text-4xl md:text-5xl text-balance">
        Let&apos;s build your
        <br />
        <span className="text-muted-foreground">AI ad team.</span>
      </h1>
      <p className="mt-4 text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
        Six steps. You can pause and resume anywhere. Everything saves as you go.
      </p>

      <div className="mt-12 rounded-lg border border-border overflow-hidden text-left max-w-xl mx-auto">
        {STEPS.map(([n, t, d], i) => (
          <div
            key={n}
            className={`grid grid-cols-[60px_140px_1fr] items-center px-5 py-3 ${i > 0 ? "hairline-t" : ""}`}
          >
            <span className="mono text-2xs text-muted-foreground tabular">{n}</span>
            <span className="text-sm font-medium text-foreground">{t}</span>
            <span className="text-sm text-muted-foreground">{d}</span>
          </div>
        ))}
      </div>

      <div className="mt-12 flex items-center justify-center">
        <Button variant="secondary" size="lg" onClick={() => setStep("dna")}>
          Begin <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
