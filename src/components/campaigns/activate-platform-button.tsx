"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";

type Status = "idle" | "confirming" | "activating";

export function ActivatePlatformButton({
  campaignId,
  platform,
}: {
  campaignId: string;
  platform: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function onActivate() {
    // Two-click confirm — activation spends real money. The first click
    // arms the button; the second fires. Resets after 4s of no follow-up
    // so the operator doesn't accidentally activate later.
    if (status === "idle") {
      setStatus("confirming");
      setTimeout(() => setStatus((s) => (s === "confirming" ? "idle" : s)), 4000);
      return;
    }
    if (status !== "confirming") return;

    setStatus("activating");
    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/platforms/${encodeURIComponent(platform)}/activate`,
        { method: "POST" },
      );
      const json = (await res.json()) as
        | { ok: true; activated: true; log: string[] }
        | { ok: false; error: string };
      if (!res.ok || !("ok" in json) || !json.ok) {
        const msg = "error" in json ? json.error : `Activation failed (${res.status})`;
        toast.error(msg);
        setStatus("idle");
        return;
      }
      toast.success(`${formatPlatform(platform)} is now ACTIVE — campaign will start delivering.`);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      disabled={status === "activating"}
      className={
        "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors " +
        (status === "confirming"
          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
          : "border-border bg-background hover:bg-muted") +
        " disabled:opacity-50 disabled:cursor-not-allowed"
      }
      title={status === "confirming" ? "Click again to confirm — this will start spend" : "Activate on platform"}
    >
      {status === "activating" ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" /> Activating
        </>
      ) : status === "confirming" ? (
        <>
          <Play className="h-3 w-3" /> Confirm activate
        </>
      ) : (
        <>
          <Play className="h-3 w-3" /> Activate
        </>
      )}
    </button>
  );
}

function formatPlatform(p: string): string {
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}
