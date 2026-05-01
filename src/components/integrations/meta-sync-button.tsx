"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "syncing" | "ok" | "error";

/**
 * Manually re-pull last 30 days of Meta Insights into MetricDaily.
 * Render only when Meta is in live mode and connected. Disabled while
 * syncing; success/error message vanishes after 6 seconds.
 */
export function MetaSyncButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function onSync() {
    setStatus("syncing");
    setMessage("Pulling last 30d from Meta…");
    try {
      const res = await fetch("/api/integrations/meta/sync", { method: "POST" });
      const body = (await res.json()) as
        | {
            ok: true;
            adAccount: { id: string; name: string };
            daysCovered: number;
            rowsUpserted: number;
            totals: { spendUsd: number; impressions: number; clicks: number; conversions: number };
          }
        | { error: string };
      if (!res.ok || "error" in body) {
        setStatus("error");
        setMessage("error" in body ? body.error : `Sync failed (${res.status})`);
      } else {
        setStatus("ok");
        const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
        setMessage(
          `${body.adAccount.name} · ${body.daysCovered}d · $${fmt.format(body.totals.spendUsd)} spend · ${fmt.format(body.totals.impressions)} impressions`,
        );
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
    }, 6000);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSync}
        disabled={status === "syncing"}
        className="text-xs px-2 py-1 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "syncing" ? "Syncing…" : "Sync now"}
      </button>
      {status !== "idle" && (
        <span
          className={`text-2xs ${
            status === "ok"
              ? "text-primary"
              : status === "error"
                ? "text-coral-600"
                : "text-muted-foreground"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
