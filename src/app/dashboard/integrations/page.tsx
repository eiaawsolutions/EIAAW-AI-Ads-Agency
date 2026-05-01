import Link from "next/link";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlatformChip } from "@/components/platform/chip";
import { allPlatforms, getAdapter } from "@/integrations/registry";
import { getActiveOrgOrRedirect } from "@/lib/active-org";
import { db } from "@/lib/db";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const ctx = await getActiveOrgOrRedirect();
  const { connected } = await searchParams;

  const integrations = await db.integration.findMany({
    where: { orgId: ctx.orgId },
    select: { platform: true, status: true, displayName: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });
  const byPlatform = new Map(integrations.map((i) => [i.platform, i]));

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
            return (
              <div
                key={p}
                className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 ${i > 0 ? "hairline-t" : ""}`}
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
                {isConnected ? (
                  <Badge variant="default" className="bg-primary/15 text-primary border-primary/20">
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline">Not connected</Badge>
                )}
                {isConnected ? (
                  <span className="mono text-2xs text-muted-foreground">
                    {adapter.mode === "stub" ? "sandbox" : "live"}
                  </span>
                ) : (
                  <Button asChild size="sm" variant="subtle">
                    <Link href={`/api/integrations/${p.toLowerCase()}/connect`}>Connect</Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="px-5 py-3 hairline-b">
            <span className="eyebrow">Analytics & CRM</span>
          </div>
          {["Google Analytics 4", "HubSpot", "Salesforce"].map((t, i) => (
            <div key={t} className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 ${i > 0 ? "hairline-t" : ""}`}>
              <span className="text-sm font-medium text-foreground">{t}</span>
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
