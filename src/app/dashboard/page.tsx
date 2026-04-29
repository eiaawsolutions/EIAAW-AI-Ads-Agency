import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { PlatformChip, PlatformDot } from "@/components/platform/chip";
import { getActiveOrgOrRedirect } from "@/lib/active-org";
import { loadOverview } from "@/lib/dashboard-data";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${Math.round(n).toLocaleString()}`;
  return `$${n.toFixed(2)}`;
}

export default async function DashboardHome() {
  const ctx = await getActiveOrgOrRedirect();
  const data = await loadOverview(ctx.orgId);
  const t = data.totals30d;

  return (
    <>
      <DashboardTopbar title="Overview" subtitle={ctx.org.name} />
      <main className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="ROAS · 30d"
            value={t.roas > 0 ? `${t.roas.toFixed(2)}×` : "—"}
            delta={t.roasDelta}
            hint="vs prior 30d"
            accent
          />
          <StatCard
            label="CPA · 30d"
            value={t.cpa > 0 ? fmtUsd(t.cpa) : "—"}
            delta={t.cpaDelta !== undefined ? -t.cpaDelta : undefined}
            hint="lower is better"
            tone="coral"
          />
          <StatCard
            label="Spend · 30d"
            value={fmtUsd(t.spendUsd)}
            delta={t.spendDelta}
            hint={data.totalSpendPaceUsdPerDay > 0 ? `Pace ${fmtUsd(data.totalSpendPaceUsdPerDay)}/day` : "No active campaigns"}
          />
          <StatCard
            label="Conversions · 30d"
            value={t.conversions.toLocaleString()}
            delta={t.conversionsDelta}
            hint="all platforms"
            tone="lime"
          />
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <div>
              <span className="eyebrow">ROAS by platform</span>
              <p className="mt-0.5 text-2xs text-muted-foreground">Last 30 days · multi-line</p>
            </div>
            <div className="flex items-center gap-4">
              {(["meta", "google", "tiktok"] as const).map((p) => (
                <div key={p} className="flex items-center gap-1.5 text-xs">
                  <PlatformDot platform={p} />
                  <span className="text-muted-foreground capitalize">{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4">
            {data.hasAnyData ? (
              <PerformanceChart data={data.chart} />
            ) : (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No metrics yet. Connect a platform from Integrations to start ingesting data.
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <div className="flex items-center justify-between px-5 py-3 hairline-b">
              <span className="eyebrow">Active experiments</span>
              <span className="mono text-xs text-muted-foreground tabular">{data.experiments.length}</span>
            </div>
            <div>
              {data.experiments.length === 0 ? (
                <div className="px-5 py-10 text-center text-xs text-muted-foreground">
                  No experiments running. Launch one from Experiments.
                </div>
              ) : (
                data.experiments.map((e, i) => (
                  <div
                    key={e.id}
                    className={`grid grid-cols-[80px_1fr_auto_60px] items-center gap-3 px-5 py-3 hover:bg-surface-1/60 transition-colors duration-150 ${i > 0 ? "hairline-t" : ""}`}
                  >
                    <span className="mono text-xs text-muted-foreground truncate">{e.id.slice(0, 8)}</span>
                    <div className="min-w-0">
                      <div className="text-sm text-foreground truncate">{e.name}</div>
                      <div className="mt-0.5">
                        <PlatformChip platform={e.primaryPlatform} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="status-dot text-primary" />
                      <span className="text-xs text-muted-foreground">{e.status.toLowerCase()}</span>
                    </div>
                    <span className="mono text-xs text-primary tabular text-right">{e.confidence}%</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <div className="flex items-center justify-between px-5 py-3 hairline-b">
              <span className="eyebrow">Latest agent runs</span>
              <div className="flex items-center gap-1.5">
                <span className="live-dot" />
                <span className="mono text-2xs text-muted-foreground">LIVE</span>
              </div>
            </div>
            <div>
              {data.recentRuns.length === 0 ? (
                <div className="px-5 py-10 text-center text-xs text-muted-foreground">
                  No agent runs yet. Trigger one from Agents.
                </div>
              ) : (
                data.recentRuns.map((r, i) => (
                  <div
                    key={r.id}
                    className={`grid grid-cols-[130px_70px_40px_1fr] items-center gap-3 px-5 py-2.5 hover:bg-surface-1/60 transition-colors duration-150 ${i > 0 ? "hairline-t" : ""}`}
                  >
                    <span className="mono text-xs text-foreground">{r.kind}</span>
                    <span
                      className={`mono text-2xs ${r.status === "running" ? "text-amber-500" : r.status === "failed" ? "text-coral-500" : "text-primary"}`}
                    >
                      {r.status}
                    </span>
                    <span className="mono text-2xs text-muted-foreground tabular">{r.relativeTime}</span>
                    <span className="text-xs text-muted-foreground truncate">{r.note}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
