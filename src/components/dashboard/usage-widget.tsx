"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type UsagePayload = {
  org: { id: string; name: string; plan: "STARTER" | "GROWTH" | "ENTERPRISE" };
  today: {
    spentUsd: number;
    capUsd: number;
    remainingUsd: number;
    callCount: number;
    tokensIn: number;
    tokensOut: number;
  };
  perAgent: { kind: string; callCount: number; costUsd: number }[];
  recent: {
    id: string;
    kind: string;
    status: string;
    model: string | null;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    createdAt: string;
    endedAt: string | null;
  }[];
};

function fmtUsd(n: number) {
  return n < 0.01 ? `$${n.toFixed(6)}` : `$${n.toFixed(4)}`;
}

function fmtAgent(kind: string) {
  return kind.toLowerCase().replace("_", "-");
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h`;
  return `${Math.round(diff / 86_400_000)}d`;
}

export function UsageWidget() {
  const [data, setData] = useState<UsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/usage", { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as UsagePayload;
        if (live) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (live) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  if (loading && !data) {
    return (
      <section className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="px-5 py-3 hairline-b">
          <span className="eyebrow">AI usage · today</span>
        </div>
        <div className="p-5 text-xs text-muted-foreground">Loading…</div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="px-5 py-3 hairline-b flex items-center justify-between">
          <span className="eyebrow">AI usage · today</span>
          <Badge variant="danger">error</Badge>
        </div>
        <div className="p-5 text-xs text-muted-foreground">
          {error === "401"
            ? "Sign in to view usage."
            : `Couldn't load usage (${error ?? "unknown"}).`}
        </div>
      </section>
    );
  }

  const pct = Math.min(100, (data.today.spentUsd / Math.max(data.today.capUsd, 0.01)) * 100);
  const overPolicy = pct >= 80;

  return (
    <section className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="px-5 py-3 hairline-b flex items-center justify-between">
        <span className="eyebrow">AI usage · today</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{data.org.plan}</Badge>
          <div className="flex items-center gap-1.5">
            <span className="live-dot" />
            <span className="mono text-2xs text-muted-foreground">LIVE</span>
          </div>
        </div>
      </div>

      {/* Top-line numbers */}
      <div className="grid grid-cols-3 divide-x divide-border">
        <div className="p-5">
          <div className="eyebrow">Spent</div>
          <div className="mt-2 display text-2xl tabular text-foreground">
            {fmtUsd(data.today.spentUsd)}
          </div>
          <div className="mt-1 text-2xs text-muted-foreground">
            {data.today.callCount.toLocaleString()} calls
          </div>
        </div>
        <div className="p-5">
          <div className="eyebrow">Remaining</div>
          <div
            className={`mt-2 display text-2xl tabular ${overPolicy ? "text-amber-500" : "text-lime-500"}`}
          >
            {fmtUsd(data.today.remainingUsd)}
          </div>
          <div className="mt-1 text-2xs text-muted-foreground">
            of ${data.today.capUsd.toFixed(2)} cap
          </div>
        </div>
        <div className="p-5">
          <div className="eyebrow">Tokens</div>
          <div className="mt-2 display text-2xl tabular text-foreground">
            {(data.today.tokensIn + data.today.tokensOut).toLocaleString()}
          </div>
          <div className="mt-1 mono text-2xs text-muted-foreground tabular">
            {data.today.tokensIn.toLocaleString()}in · {data.today.tokensOut.toLocaleString()}out
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-4">
        <Progress value={pct} />
        <div className="mt-1.5 flex items-center justify-between mono text-2xs tabular text-muted-foreground">
          <span>0</span>
          <span>{pct.toFixed(1)}% used</span>
          <span>${data.today.capUsd.toFixed(0)}</span>
        </div>
      </div>

      {/* Per-agent breakdown */}
      {data.perAgent.length > 0 && (
        <>
          <div className="hairline-t px-5 py-3">
            <span className="eyebrow">By agent</span>
          </div>
          <div className="divide-y divide-border">
            {data.perAgent
              .sort((a, b) => b.costUsd - a.costUsd)
              .map((a) => (
                <div
                  key={a.kind}
                  className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-2"
                >
                  <span className="mono text-xs text-foreground">{fmtAgent(a.kind)}</span>
                  <span className="mono text-2xs text-muted-foreground tabular">
                    {a.callCount} call{a.callCount === 1 ? "" : "s"}
                  </span>
                  <span className="mono text-xs text-primary tabular w-20 text-right">
                    {fmtUsd(a.costUsd)}
                  </span>
                </div>
              ))}
          </div>
        </>
      )}

      {/* Recent runs */}
      {data.recent.length > 0 && (
        <>
          <div className="hairline-t px-5 py-3">
            <span className="eyebrow">Recent runs</span>
          </div>
          <div className="divide-y divide-border">
            {data.recent.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[120px_70px_1fr_70px_40px] gap-3 items-center px-5 py-2 mono text-xs"
              >
                <span className="text-foreground truncate">{fmtAgent(r.kind)}</span>
                <span
                  className={
                    r.status === "SUCCEEDED"
                      ? "text-primary"
                      : r.status === "FAILED"
                        ? "text-coral-500"
                        : "text-muted-foreground"
                  }
                >
                  {r.status.toLowerCase()}
                </span>
                <span className="text-muted-foreground truncate tabular">
                  {r.tokensIn}/{r.tokensOut}
                </span>
                <span className="text-foreground tabular text-right">{fmtUsd(r.costUsd)}</span>
                <span className="text-muted-foreground text-right">{timeAgo(r.createdAt)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
