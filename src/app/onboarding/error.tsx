"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[onboarding] client error:", error);
  }, [error]);

  function clearAndReload() {
    try {
      localStorage.removeItem("eiaaw-wizard");
    } catch {
      // ignore
    }
    window.location.reload();
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <span className="eyebrow">Onboarding</span>
        <h1 className="mt-3 display text-2xl">Something went wrong loading the wizard.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Most often this is stale state from a prior version. Resetting clears your
          in-progress wizard data and starts fresh.
        </p>
        {error?.message && (
          <pre className="mt-4 overflow-auto rounded-md border border-border bg-surface-1 p-3 text-left text-xs text-muted-foreground">
            {error.message}
            {error.digest ? `\ndigest: ${error.digest}` : ""}
          </pre>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={clearAndReload}>
            Reset wizard
          </Button>
          <Button variant="ghost" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
