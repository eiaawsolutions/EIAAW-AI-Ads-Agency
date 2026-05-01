"use client";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "./wizard-store";

export function StepDone() {
  const reset = useWizard((s) => s.reset);

  return (
    <div>
      <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/5">
        <Check className="h-6 w-6 text-primary" />
      </div>
      <span className="eyebrow">Live</span>
      <h1 className="mt-3 display text-4xl md:text-5xl text-balance">
        Your AI team is
        <br />
        <span className="text-muted-foreground">running.</span>
      </h1>
      <p className="mt-4 text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
        Brand DNA, strategy, and competitor intel are saved to your workspace. The dashboard will guide you through the next milestone — connecting an ad platform — so the agents can audit live performance.
      </p>
      <div className="mt-10 flex items-center justify-center gap-2">
        <Button asChild variant="secondary" size="lg">
          <Link href="/dashboard">Continue on dashboard →</Link>
        </Button>
        <Button variant="ghost" size="lg" onClick={reset}>
          Restart wizard
        </Button>
      </div>
    </div>
  );
}
