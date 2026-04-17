"use client";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWizard } from "./wizard-store";

export function StepDone() {
  const reset = useWizard((s) => s.reset);

  return (
    <div className="text-center">
      <div className="mx-auto h-20 w-20 rounded-full bg-brand-500/20 grid place-items-center">
        <CheckCircle2 className="h-10 w-10 text-brand-400" />
      </div>
      <Badge className="mt-8">Live</Badge>
      <h1 className="mt-4 text-5xl md:text-6xl font-semibold tracking-tight text-balance">
        Your AI team is <span className="text-gradient">running.</span>
      </h1>
      <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
        Campaigns are in-flight. Audit, creative, test, math, and budget agents will report in 24 hours
        with the first optimization cycle.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg" variant="gradient">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button variant="secondary" size="lg" onClick={reset}>Restart onboarding</Button>
      </div>
    </div>
  );
}
