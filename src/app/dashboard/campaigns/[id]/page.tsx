import { notFound } from "next/navigation";
import Link from "next/link";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformChip } from "@/components/platform/chip";
import {
  PlatformStatusRow,
  type PlatformLaunchState,
} from "@/components/campaigns/platform-status-row";
import { RetryPlatformButton } from "@/components/campaigns/retry-platform-button";
import { ActivatePlatformButton } from "@/components/campaigns/activate-platform-button";
import { getActiveOrgOrRedirect } from "@/lib/active-org";
import { db } from "@/lib/db";
import { EXCLUDE_SYNTHETIC } from "@/lib/campaign-filters";

export const metadata = { title: "Campaign" };
export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  LIVE: "live",
  SCHEDULED: "default",
  DRAFT: "outline",
  PAUSED: "warn",
  ARCHIVED: "outline",
} as const;

type AdSetMeta = {
  state?: PlatformLaunchState;
  reason?: string;
  remediation?: { label: string; href: string } | null;
  adapterMode?: "live" | "stub";
  launchedAt?: string;
  log?: string[];
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getActiveOrgOrRedirect();

  const campaign = await db.campaign.findFirst({
    where: { id, orgId: ctx.orgId, ...EXCLUDE_SYNTHETIC },
    include: { adSets: { orderBy: { platform: "asc" } } },
  });
  if (!campaign) notFound();

  const blockedCount = campaign.adSets.filter((a) => {
    const m = (a.meta ?? {}) as AdSetMeta;
    return m.state === "requires_action" || m.state === "failed";
  }).length;
  const liveCount = campaign.adSets.filter((a) => {
    const m = (a.meta ?? {}) as AdSetMeta;
    return m.state === "live";
  }).length;

  return (
    <>
      <DashboardTopbar
        title={campaign.name}
        subtitle={`${campaign.adSets.length} platform${campaign.adSets.length === 1 ? "" : "s"} · ${liveCount} live${blockedCount > 0 ? ` · ${blockedCount} need attention` : ""}`}
        crumbs={["Campaigns"]}
      />
      <main className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[campaign.status] ?? "outline"}>{campaign.status}</Badge>
            <span className="text-2xs mono text-muted-foreground">
              {campaign.objective} · {campaign.currency}
            </span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/campaigns">← All campaigns</Link>
          </Button>
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Platforms</span>
            {blockedCount > 0 && (
              <span className="text-2xs text-amber-600">
                {blockedCount} platform{blockedCount === 1 ? " needs" : "s need"} action
              </span>
            )}
          </div>
          {campaign.adSets.length === 0 ? (
            <div className="rounded-md border border-border px-4 py-8 text-center text-xs text-muted-foreground">
              No platforms attached.
            </div>
          ) : (
            campaign.adSets.map((adSet) => {
              const meta = (adSet.meta ?? {}) as AdSetMeta;
              const state: PlatformLaunchState = meta.state ?? "draft";
              const showRetry = state === "requires_action" || state === "failed" || state === "draft";
              // Show Activate when the platform created the campaign upstream
              // (state === "live" + has externalId) AND our local AdSet still
              // reflects the platform's PAUSED state. Once activated, state
              // stays "live" but AdSet.status flips to LIVE — that's our
              // signal to hide the button.
              const showActivate =
                state === "live" &&
                !!adSet.externalId &&
                adSet.status !== "LIVE" &&
                meta.adapterMode === "live";
              return (
                <PlatformStatusRow
                  key={adSet.id}
                  platform={adSet.platform}
                  state={state}
                  externalCampaignId={adSet.externalId}
                  reason={meta.reason ?? "No status recorded for this platform."}
                  remediation={meta.remediation ?? null}
                  adapterMode={meta.adapterMode}
                  actions={
                    showRetry ? (
                      <RetryPlatformButton campaignId={campaign.id} platform={adSet.platform} />
                    ) : showActivate ? (
                      <ActivatePlatformButton campaignId={campaign.id} platform={adSet.platform} />
                    ) : undefined
                  }
                />
              );
            })
          )}
        </section>

        <section className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="px-5 py-3 hairline-b">
            <span className="eyebrow">Budget</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border">
            <Stat
              label="Daily"
              value={
                campaign.dailyBudget != null
                  ? `${campaign.currency} ${(campaign.dailyBudget / 100).toLocaleString()}`
                  : "—"
              }
            />
            <Stat
              label="Total"
              value={
                campaign.totalBudget != null
                  ? `${campaign.currency} ${(campaign.totalBudget / 100).toLocaleString()}`
                  : "—"
              }
            />
            <Stat
              label="Created"
              value={new Date(campaign.createdAt).toLocaleDateString()}
            />
          </div>
        </section>

        <section className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="px-5 py-3 hairline-b flex items-center justify-between">
            <span className="eyebrow">Selected platforms</span>
            <div className="flex flex-wrap gap-1">
              {campaign.platforms.map((p) => (
                <PlatformChip key={p} platform={p.toLowerCase()} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 text-sm mono tabular text-foreground">{value}</div>
    </div>
  );
}
