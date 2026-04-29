"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard/topbar";

type Event = {
  id: string;
  agent: string;
  status: string;
  message: string;
  at: string;
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour12: false });
}

function levelOf(status: string): "ok" | "warn" | "info" {
  if (status === "SUCCEEDED") return "ok";
  if (status === "FAILED" || status === "CANCELED") return "warn";
  return "info";
}

export default function LivePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sinceRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function tick() {
      const url = sinceRef.current
        ? `/api/agent-runs/recent?since=${encodeURIComponent(sinceRef.current)}&limit=40`
        : `/api/agent-runs/recent?limit=40`;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { runs: Event[] };
        if (!alive) return;
        if (data.runs.length > 0) {
          sinceRef.current = data.runs[0].at;
          setEvents((prev) => {
            const merged = [...data.runs, ...prev];
            const seen = new Set<string>();
            const dedup: Event[] = [];
            for (const e of merged) {
              if (seen.has(e.id)) continue;
              seen.add(e.id);
              dedup.push(e);
            }
            return dedup.slice(0, 200);
          });
        }
        setError(null);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    }

    tick();
    const id = setInterval(tick, 5_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <>
      <DashboardTopbar title="Live monitor" subtitle="Agent runs from this org · polls every 5s" />
      <main className="p-6">
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <div className="flex items-center gap-3">
              <span className="live-dot" />
              <span className="text-sm font-medium text-foreground">Streaming</span>
              <span className="mono text-xs text-muted-foreground">{events.length} events</span>
            </div>
            <span className="mono text-2xs text-muted-foreground">
              {error ? `error: ${error}` : "GET /api/agent-runs/recent"}
            </span>
          </div>
          {events.length === 0 ? (
            <div className="px-5 py-16 text-center text-xs text-muted-foreground">
              No agent runs yet. Trigger an agent from the Agents page to see live activity.
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-[70vh] overflow-y-auto scrollbar-thin">
              {events.map((e) => {
                const level = levelOf(e.status);
                return (
                  <li
                    key={e.id}
                    className="grid grid-cols-[90px_140px_40px_1fr] items-center gap-3 px-5 py-2 mono text-xs hover:bg-surface-1/50 transition-colors duration-150 fade-in"
                  >
                    <span className="text-muted-foreground/60 tabular">{fmtTime(e.at)}</span>
                    <span
                      className={
                        e.agent.startsWith("ads-meta")
                          ? "pf-meta pf-text"
                          : e.agent.startsWith("ads-google")
                            ? "pf-google pf-text"
                            : e.agent.startsWith("ads-tiktok")
                              ? "pf-tiktok pf-text"
                              : "text-foreground/80"
                      }
                    >
                      {e.agent}
                    </span>
                    <span
                      className={
                        level === "ok"
                          ? "text-primary"
                          : level === "warn"
                            ? "text-amber-400"
                            : "text-muted-foreground/70"
                      }
                    >
                      {level === "ok" ? "✓" : level === "warn" ? "!" : "·"}
                    </span>
                    <span className="text-foreground/90 truncate">{e.message}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
