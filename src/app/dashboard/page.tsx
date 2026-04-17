import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";

export const metadata = { title: "Dashboard" };

function genChart() {
  return Array.from({ length: 30 }).map((_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(5, 10),
    roas: Number((2.2 + Math.random() * 2.6).toFixed(2)),
    spend: Math.round(1500 + Math.random() * 2500),
  }));
}

const EXPERIMENTS = [
  { n: "exp_17", title: "Headline: benefit vs proof",      platform: "Meta",    conf: 86, status: "running" },
  { n: "exp_18", title: "CTA: Shop now vs Try risk-free",  platform: "Google",  conf: 62, status: "running" },
  { n: "exp_19", title: "Audience: LAL 1% vs 3%",          platform: "TikTok",  conf: 44, status: "running" },
];

const RUNS: [string, string, string, string][] = [
  ["ads-audit",     "succeeded", "2m",  "scan 250 checks · score 78"],
  ["ads-budget",    "succeeded", "14m", "reallocated $340 · ttok → meta"],
  ["ads-creative",  "succeeded", "42m", "fatigue flagged on cr_482"],
  ["ads-test",      "running",   "now", "exp_19 sample size calc"],
  ["ads-math",      "succeeded", "1h",  "forecast refreshed"],
  ["ads-competitor","succeeded", "3h",  "4 competitors scanned"],
];

export default function DashboardHome() {
  const chart = genChart();
  return (
    <>
      <DashboardTopbar title="Overview" subtitle="Aurora Skincare · Q2 Spring Launch" />
      <main className="p-6 space-y-6">
        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="ROAS · 30d" value="3.42×" delta={12.4} hint="Target 3.50×" accent />
          <StatCard label="CPA · 30d" value="$21.80" delta={-6.1} hint="Target $22.00" />
          <StatCard label="Spend · 30d" value="$48,210" delta={3.2} hint="Pace $1,607/day" />
          <StatCard label="Conversions · 30d" value="2,212" delta={9.7} hint="3 platforms" />
        </div>

        {/* Chart */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <div>
              <span className="eyebrow">ROAS vs spend</span>
              <p className="mt-0.5 text-2xs text-muted-foreground">Last 30 days · all platforms</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="h-0.5 w-3 bg-primary" />
                <span className="text-muted-foreground">ROAS</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="h-0.5 w-3 bg-muted-foreground" />
                <span className="text-muted-foreground">Spend</span>
              </div>
            </div>
          </div>
          <div className="p-4">
            <PerformanceChart data={chart} />
          </div>
        </div>

        {/* Two-column: experiments + agent runs */}
        <div className="grid lg:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 hairline-b">
              <span className="eyebrow">Active experiments</span>
              <span className="mono text-xs text-muted-foreground tabular">{EXPERIMENTS.length}</span>
            </div>
            <div>
              {EXPERIMENTS.map((e, i) => (
                <div
                  key={e.n}
                  className={`grid grid-cols-[80px_1fr_80px_60px] items-center gap-3 px-5 py-3 hover:bg-surface-1/50 transition-colors duration-150 ${i > 0 ? "hairline-t" : ""}`}
                >
                  <span className="mono text-xs text-muted-foreground">{e.n}</span>
                  <div className="min-w-0">
                    <div className="text-sm text-foreground truncate">{e.title}</div>
                    <div className="mono text-2xs text-muted-foreground">{e.platform}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="status-dot text-primary" />
                    <span className="text-xs text-muted-foreground">{e.status}</span>
                  </div>
                  <span className="mono text-xs text-primary tabular text-right">{e.conf}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 hairline-b">
              <span className="eyebrow">Latest agent runs</span>
              <div className="flex items-center gap-1.5">
                <span className="live-dot" />
                <span className="mono text-2xs text-muted-foreground">LIVE</span>
              </div>
            </div>
            <div>
              {RUNS.map(([agent, status, time, note], i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[130px_60px_40px_1fr] items-center gap-3 px-5 py-2.5 hover:bg-surface-1/50 transition-colors duration-150 ${i > 0 ? "hairline-t" : ""}`}
                >
                  <span className="mono text-xs text-foreground">{agent}</span>
                  <span
                    className={`mono text-2xs ${status === "running" ? "text-amber-400" : "text-primary"}`}
                  >
                    {status}
                  </span>
                  <span className="mono text-2xs text-muted-foreground tabular">{time}</span>
                  <span className="text-xs text-muted-foreground truncate">{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
