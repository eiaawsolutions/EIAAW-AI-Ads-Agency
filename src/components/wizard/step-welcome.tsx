"use client";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWizard } from "./wizard-store";

export function StepWelcome() {
  const setStep = useWizard((s) => s.setStep);
  return (
    <div className="text-center">
      <Badge>Onboarding · 15 minutes</Badge>
      <h1 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight text-balance">
        Let&apos;s build your <span className="text-gradient">AI ad team.</span>
      </h1>
      <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
        Six steps. Brand DNA, strategy, competitor scan, forecast, and launch. You can pause
        and resume anywhere — everything saves as you go.
      </p>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
        {[
          { n: "01", t: "Brand DNA", d: "We extract voice, audience, palette, positioning." },
          { n: "02", t: "Strategy", d: "Your channel mix, funnel, and KPI targets." },
          { n: "03", t: "Competitor Intel", d: "Their ad spend, formats, and your whitespace." },
          { n: "04", t: "Forecast", d: "Three budget scenarios before you spend." },
          { n: "05", t: "Creative", d: "Concepts and copy tailored to each platform." },
          { n: "06", t: "Launch", d: "One click. Seven platforms. Auto-optimized." },
        ].map((s) => (
          <div key={s.n} className="glass rounded-lg p-5">
            <span className="mono-tag">{s.n}</span>
            <h3 className="mt-3 font-semibold text-sm">{s.t}</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.d}</p>
          </div>
        ))}
      </div>

      <Button size="lg" variant="gradient" className="mt-12" onClick={() => setStep("dna")}>
        Begin onboarding <ArrowRight />
      </Button>
    </div>
  );
}
