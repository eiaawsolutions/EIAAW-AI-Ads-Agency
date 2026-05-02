"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Status = "idle" | "retrying";

export function RetryPlatformButton({
  campaignId,
  platform,
}: {
  campaignId: string;
  platform: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function onRetry() {
    setStatus("retrying");
    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/platforms/${encodeURIComponent(platform)}/retry`,
        { method: "POST" },
      );
      const json = (await res.json()) as
        | { ok: true; state: string; reason: string }
        | { error: string };
      if (!res.ok || "error" in json) {
        toast.error("error" in json ? json.error : `Retry failed (${res.status})`);
      } else if (json.state === "live") {
        toast.success(`Live on ${formatPlatform(platform)}.`);
      } else if (json.state === "requires_action") {
        toast(`${formatPlatform(platform)} still needs attention — ${json.reason}`);
      } else if (json.state === "failed") {
        toast.error(`${formatPlatform(platform)} failed — ${json.reason}`);
      } else {
        toast(`${formatPlatform(platform)} → ${json.state}`);
      }
      // Re-fetch the server-rendered detail page so all rows show fresh state.
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
      onClick={onRetry}
      disabled={status === "retrying"}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {status === "retrying" ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" /> Retrying
        </>
      ) : (
        <>
          <RefreshCw className="h-3 w-3" /> Retry
        </>
      )}
    </button>
  );
}

function formatPlatform(p: string): string {
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}
