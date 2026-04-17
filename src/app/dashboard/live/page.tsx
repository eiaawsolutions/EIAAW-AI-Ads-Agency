"use client";

import { useEffect, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Event = { id: string; agent: string; message: string; at: string; level: "info" | "warn" | "ok" };

function seedEvents(): Event[] {
  return [
    { id: "1", agent: "ads-audit", message: "CAPI dedup confirmed for Meta pixel", at: now(-4), level: "ok" },
    { id: "2", agent: "ads-test", message: "Headline experiment reached significance (p=0.04)", at: now(-12), level: "ok" },
    { id: "3", agent: "ads-creative", message: "Ad cr_482 flagged for fatigue (frequency 2.8)", at: now(-24), level: "warn" },
    { id: "4", agent: "ads-budget", message: "Reallocated $340/day from TikTok → Meta", at: now(-36), level: "info" },
    { id: "5", agent: "ads-math", message: "Forecast updated with new conversion rate", at: now(-48), level: "info" },
  ];
}
function now(offsetSec: number) { return new Date(Date.now() + offsetSec * 1000).toLocaleTimeString(); }

export default function LivePage() {
  const [events, setEvents] = useState<Event[]>(seedEvents());

  useEffect(() => {
    const agents = ["ads-audit", "ads-test", "ads-creative", "ads-budget", "ads-math", "ads-meta", "ads-google", "ads-tiktok"];
    const messages = [
      "impressions sync completed",
      "CTR anomaly flagged on ad_cr_221",
      "budget pacing 94% of plan",
      "new variant shipped to experiment exp_17",
      "landing page score increased to 82",
      "competitor scan queued for market US",
    ];
    const id = setInterval(() => {
      setEvents((prev) => [
        {
          id: Math.random().toString(36).slice(2),
          agent: agents[Math.floor(Math.random() * agents.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
          at: new Date().toLocaleTimeString(),
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
      <main className="p-8">
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-sm font-semibold">Streaming</span>
              <Badge variant="live">{events.length} events</Badge>
            </div>
            <span className="mono-tag">wss://live.eiaaw.ai</span>
          </div>
          <ul className="divide-y divide-white/5 max-h-[70vh] overflow-y-auto">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-4 px-5 py-3 font-mono text-xs hover:bg-white/[0.02]">
                <span className="text-muted-foreground w-24 shrink-0">{e.at}</span>
                <span className="w-32 shrink-0 text-brand-300">{e.agent}</span>
                <span className="flex-1 text-foreground/85">{e.message}</span>
                <span className={
                  e.level === "ok" ? "text-emerald-400" :
                  e.level === "warn" ? "text-amber-300" :
                  "text-muted-foreground"
                }>
                  {e.level.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </>
  );
}
