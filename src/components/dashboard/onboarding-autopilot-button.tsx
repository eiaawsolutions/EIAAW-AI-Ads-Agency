"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

type Props = { milestoneKey: "audit" };

/**
 * Kicks off the next milestone in autopilot mode.
 *
 * For "audit": POSTs /api/audits/trigger which enqueues a durable
 * AGENT_CHAIN job. We don't poll here — the audit takes minutes and the
 * dashboard already surfaces in-flight runs in its agent-runs panel.
 * Successful enqueue refreshes the route so the hero can re-render with
 * fresh setup status (and potentially disappear once the audit completes).
 */
export function OnboardingAutopilotButton({ milestoneKey }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    if (milestoneKey === "audit") {
      const res = await apiFetch<{ enqueued?: boolean; reason?: string; jobId?: string }>(
        "/api/audits/trigger",
        { method: "POST" },
      );
      setBusy(false);

      if (!res.ok) {
        // 429/402/401 already toasted by apiFetch; only show otherwise
        if (![429, 402, 401].includes(res.status) && res.status < 500) {
          toast.error(res.error);
        }
        return;
      }
      if (res.data.enqueued === false) {
        toast.message("Audit already running", {
          description: res.data.reason ?? "Refresh in a few minutes.",
        });
      } else {
        toast.success("Audit queued — agents are working", {
          description: "Findings appear under Performance Audit when ready.",
        });
      }
      // Re-render the hero with fresh status — the in-progress job will
      // shift to ✓ once it completes on the next dashboard view.
      router.refresh();
      return;
    }

    setBusy(false);
  }

  return (
    <Button onClick={run} disabled={busy} variant="secondary" size="default">
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Starting agents
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" /> Run on autopilot
        </>
      )}
    </Button>
  );
}
