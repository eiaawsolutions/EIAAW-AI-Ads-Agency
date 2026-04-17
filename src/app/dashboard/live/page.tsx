"use client";

import { useEffect, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard/topbar";

type Event = { id: string; agent: string; message: string; at: string; level: "info" | "warn" | "ok" };

function seedEvents(): Event[] {
  return [
    { id: "1", agent: "ads-audit",     message: "CAPI dedup confirmed for Meta pixel", at: now(-4),  level: "ok" },
    { id: "2", agent: "ads-test",      message: "Headline experiment reached significance · p=0.04", at: now(-12), level: "ok" },
    { id: "3", agent: "ads-creative",  message: "ad cr_482 flagged for fatigue · frequency 2.8", at: now(-24), level: "warn" },
    { id: "4", agent: "ads-budget",    message: "reallocated $340/day · tiktok → meta", at: now(-36), level: "info" },
    { id: "5", agent: "ads-math",      message: "forecast updated with new conversion rate", at: now(-48), level: "info" },
  ];
}
function now(offsetSec: number) {
  return new Date(Date.now() + offsetSec * 1000).toLocaleTimeString("en-US", { hour12: false });
}

export default function LivePage() {
  const [events, setEvents] = useState<Event[]>(seedEvents());

  useEffect(() => {
    const agents = ["ads-audit", "ads-test", "ads-creative", "ads-budget", "ads-math", "ads-meta", "ads-google", "ads-tiktok"];
    const messages = [
      "impressions sync completed",
      "CTR anomaly flagged on ad cr_221",
      "budget pacing 94% of plan",
      "new variant shipped to exp_17",
      "landing page score increased to 82",
      "competitor scan queued for market US",
    ];
    const id = setInterval(() => {
      setEvents((prev) => [
        {
          id: Math.random().toString(36).slice(2),
          agent: agents[Math.floor(Math.random() * agents.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
          at: new Date().toLocaleTimeString("en-US", { hour12: false }),
          level: (["info", "warn", "ok"] as const)[Math.floor(Math.random() * 3)],
        },
        ...prev.slice(0, 40),
      ]);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <DashboardTopbar title="Live monitor" subtitle="Real-time signal stream from every agent" />
      <main className="p-6">
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <div className="flex items-center gap-3">
              <span className="live-dot" />
              <span className="text-sm font-medium text-foreground">Streaming</span>
              <span className="mono text-xs text-muted-foreground">{events.length} events</span>
            </div>
            <span className="mono text-2xs text-muted-foreground">wss://live.eiaaw.ai</span>
          </div>
          <ul className="divide-y divide-border max-h-[70vh] overflow-y-auto scrollbar-thin">
            {events.map((e) => (
              <li
                key={e.id}
                className="grid grid-cols-[90px_140px_40px_1fr] items-center gap-3 px-5 py-2 mono text-xs hover:bg-surface-1/50 transition-colors duration-150 fade-in"
              >
                <span className="text-muted-foreground/60 tabular">{e.at}</span>
                <span className={e.agent.startsWith("ads-meta") ? "pf-meta pf-text" :
                                  e.agent.startsWith("ads-google") ? "pf-google pf-text" :
                                  e.agent.startsWith("ads-tiktok") ? "pf-tiktok pf-text" :
                                  "text-foreground/80"}>
                  {e.agent}
                </span>
                <span
                  className={
                    e.level === "ok"
                      ? "text-primary"
                      : e.level === "warn"
                        ? "text-amber-400"
                        : "text-muted-foreground/70"
                  }
                >
                  {e.level === "ok" ? "✓" : e.level === "warn" ? "!" : "·"}
                </span>
                <span className="text-foreground/90 truncate">{e.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
