import Link from "next/link";
import { Platform } from "@prisma/client";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlatformChip } from "@/components/platform/chip";
import { DisconnectButton } from "@/components/integrations/disconnect-button";
import { MetaSyncButton } from "@/components/integrations/meta-sync-button";
import { MetaMcpPanel } from "@/components/integrations/meta-mcp-panel";
import { allPlatforms, getAdapter } from "@/integrations/registry";
import { getActiveOrgOrRedirect } from "@/lib/active-org";
import { db } from "@/lib/db";
import { tokenHealth, tokenHealthLabel } from "@/lib/integration-health";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const ctx = await getActiveOrgOrRedirect();
  const { connected } = await searchParams;

  // Collapse to one row per platform, preferring connected over revoked.
  // We may have multiple rows per (orgId, platform) when the user reconnects
  // (different externalId each time, especially on stub-mode adapters).
  // Without this filter the Map.set in build below would overwrite the
  // newest connected row with an older revoked stub.
  const integrations = await db.integration.findMany({
    where: { orgId: ctx.orgId },
    select: { platform: true, status: true, displayName: true, expiresAt: true, updatedAt: true },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  const byPlatform = new Map<typeof integrations[number]["platform"], typeof integrations[number]>();
  for (const row of integrations) {
    const existing = byPlatform.get(row.platform);
    if (!existing) {
      byPlatform.set(row.platform, row);
      continue;
    }
    // Prefer connected over revoked; among same-status, keep most recent.
    if (existing.status !== "connected" && row.status === "connected") {
      byPlatform.set(row.platform, row);
    }
  }

  // For the live-mode Meta row, surface the last successful Insights sync
  // so the operator knows whether the audit has fresh ground truth.
  const metaConnected = byPlatform.get(Platform.META)?.status === "connected";
  const metaLiveMode = getAdapter(Platform.META).mode === "live";
  const metaShowSync = metaConnected && metaLiveMode;
  const metaLastIngest = metaShowSync
    ? await db.metricDaily.findFirst({
        where: {
          platform: Platform.META,
          campaign: { orgId: ctx.orgId, name: "Account totals (Meta)" },
        },
        orderBy: { date: "desc" },
        select: { date: true },
      })
    : null;

  return (
    <>
      <DashboardTopbar title="Integrations" subtitle="Connect ad accounts, analytics, and CRMs" />
      <main className="p-6 space-y-6">
        {connected && (
          <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <span className="mono text-xs text-primary mr-2">CONNECTED</span>
            {connected.toUpperCase()} is now linked. Agents will start auditing live performance shortly.
          </div>
        )}

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="px-5 py-3 hairline-b">
            <span className="eyebrow">Ad platforms</span>
          </div>
          {allPlatforms.map((p, i) => {
            const adapter = getAdapter(p);
            const row = byPlatform.get(p);
            const isConnected = row?.status === "connected";
            const health = isConnected ? tokenHealth(row?.expiresAt) : null;
            const healthLabel = isConnected ? tokenHealthLabel(row?.expiresAt) : null;
            const slug = p.toLowerCase();
            return (
              <div
                key={p}
                className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-4 ${i > 0 ? "hairline-t" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PlatformChip platform={p} />
                  <span className="text-xs text-muted-foreground hidden md:inline truncate">
                    {isConnected
                      ? row?.displayName ?? `${p} account linked`
                      : adapter.mode === "live"
                        ? "OAuth ready · click Connect to authorize"
                        : "Sandbox mode · click Connect to simulate"}
                  </span>
                </div>

                {/* Token health pill (only for connected rows that aren't healthy) */}
                {isConnected && health === "expired" ? (
                  <span className="mono text-2xs text-coral-600 bg-coral-500/10 border border-coral-500/30 rounded-md px-2 py-0.5">
                    {healthLabel}
                  </span>
                ) : isConnected && health === "expiring_soon" ? (
                  <span className="mono text-2xs text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-0.5">
                    {healthLabel}
                  </span>
                ) : (
                  <span aria-hidden />
                )}

                {/* Connection status badge */}
                {isConnected ? (
                  <Badge variant="default" className="bg-primary/15 text-primary border-primary/20">
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline">Not connected</Badge>
                )}

                {/* Action: Connect / Disconnect */}
                {isConnected ? (
                  <div className="flex items-center gap-3">
                    {p === Platform.META && metaShowSync && (
                      <div className="flex flex-col items-end gap-0.5">
                        <MetaSyncButton />
                        {metaLastIngest?.date && (
                          <span className="text-2xs text-muted-foreground mono">
                            last sync · {metaLastIngest.date.toISOString().slice(0, 10)}
                          </span>
                        )}
                      </div>
                    )}
                    <DisconnectButton
                      platform={slug}
                      displayName={row?.displayName ?? p}
                    />
                  </div>
                ) : (
                  <Button asChild size="sm" variant="subtle">
                    {/* prefetch=false is load-bearing: Next.js prefetches Links
                        in viewport, which would issue a real GET to /connect.
                        That route 302s into /callback, and the stub callback
                        upserts a fresh connected row on every hit — making
                        Disconnect look like it auto-reconnects. */}
                    <Link href={`/api/integrations/${slug}/connect`} prefetch={false}>
                      Connect
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <MetaMcpPanel metaConnected={metaConnected} />

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="px-5 py-3 hairline-b">
            <span className="eyebrow">Analytics & CRM</span>
          </div>
          {["Google Analytics 4", "HubSpot", "Salesforce"].map((t, i) => (
            <div
              key={t}
              className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-4 ${i > 0 ? "hairline-t" : ""}`}
            >
              <span className="text-sm font-medium text-foreground">{t}</span>
              <span aria-hidden />
              <Badge variant="outline">Coming soon</Badge>
              <Button size="sm" variant="subtle" disabled>
                Connect
              </Button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
