import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Dashboard" };

function genChart() {
  return Array.from({ length: 30 }).map((_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(5, 10),
    roas: Number((2.2 + Math.random() * 2.6).toFixed(2)),
    spend: Math.round(1500 + Math.random() * 2500),
  }));
}

export default function DashboardHome() {
  const chart = genChart();
  return (
    <>
      <DashboardTopbar title="Overview" subtitle="Aurora Skincare · Q2 Spring Launch" />
      <main className="p-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="ROAS · 30d" value="3.42×" delta={12.4} hint="Target 3.50×" accent />
          <StatCard label="CPA · 30d" value="$21.80" delta={-6.1} hint="Target $22.00" />
          <StatCard label="Spend · 30d" value="$48,210" delta={3.2} hint="Daily pace $1,607" />
          <StatCard label="Conversions · 30d" value="2,212" delta={9.7} hint="Across 3 platforms" />
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">ROAS vs spend</h3>
              <p className="text-xs text-muted-foreground">Last 30 days · all platforms</p>
            </div>
            <Badge variant="live">Live</Badge>
          </div>
          <div className="mt-5">
            <PerformanceChart data={chart} />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Active experiments</h3>
              <Badge>3 running</Badge>
            </div>
            <ul className="mt-4 space-y-3">
              {[
                { n: "Headline: benefit vs. proof", p: "Meta · ads-test", conf: 86 },
                { n: "CTA: Shop now vs. Try risk-free", p: "Google · ads-test", conf: 62 },
                { n: "Audience: lookalike 1% vs. 3%", p: "TikTok · ads-test", conf: 44 },
              ].map((e) => (
                <li key={e.n} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{e.n}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{e.p}</div>
                  </div>
                  <div className="font-mono text-xs text-brand-300">{e.conf}%</div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Latest agent runs</h3>
              <Badge>live feed</Badge>
            </div>
            <ul className="mt-4 space-y-3 font-mono text-xs">
              {[
                ["ads-audit", "succeeded", "2m"],
                ["ads-budget", "succeeded", "14m"],
                ["ads-creative", "succeeded", "42m"],
                ["ads-test", "running", "now"],
                ["ads-math", "succeeded", "1h"],
                ["ads-competitor", "succeeded", "3h"],
              ].map(([k, s, t]) => (
                <li key={String(k) + String(t)} className="flex items-center justify-between border-b border-white/5 pb-2.5 last:border-0">
                  <span className="text-brand-300">{k}</span>
                  <span className={s === "running" ? "text-amber-300" : "text-emerald-400"}>{s}</span>
                  <span className="text-muted-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </main>
    </>
  );
}
