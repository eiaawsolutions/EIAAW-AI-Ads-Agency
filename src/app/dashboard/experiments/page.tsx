import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformChip } from "@/components/platform/chip";
import { Plus } from "lucide-react";
import { getActiveOrgOrRedirect } from "@/lib/active-org";
import { db } from "@/lib/db";
import type { Platform } from "@prisma/client";

export const metadata = { title: "Experiments" };
export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  RUNNING: "live",
  COMPLETED: "solid",
  DRAFT: "outline",
  ABORTED: "danger",
} as const;

function variantLabel(v: { key: string; payload: unknown }): string {
  const p = v.payload as { headline?: string; body?: string; cta?: string; audience?: string } | null;
  const text = p?.headline ?? p?.cta ?? p?.body ?? p?.audience ?? "";
  return text ? `${v.key}: ${String(text).slice(0, 40)}` : v.key;
}

export default async function ExperimentsPage() {
  const ctx = await getActiveOrgOrRedirect();

  const experiments = await db.experiment.findMany({
    where: { orgId: ctx.orgId },
    orderBy: [{ status: "asc" }, { startedAt: "desc" }, { createdAt: "desc" }],
    include: {
      campaign: { select: { platforms: true } },
      variants: { select: { key: true, payload: true } },
    },
    take: 50,
  });

  return (
    <>
      <DashboardTopbar title="Experiments" subtitle="ads-test · closed-loop learning" />
      <main className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Running & recent</span>
          <Button variant="secondary">
            <Plus className="h-3.5 w-3.5" /> New experiment
          </Button>
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {experiments.length === 0 ? (
            <div className="px-5 py-16 text-center text-xs text-muted-foreground">
              No experiments yet. Trigger <span className="mono">ads-test</span> from Agents to design one.
            </div>
          ) : (
            experiments.map((e, i) => {
              const conf = Math.round((e.confidence ?? 0) * 100) || 0;
              const platform = ((e.campaign?.platforms?.[0] ?? "META") as Platform).toLowerCase();
              return (
                <div key={e.id} className={`p-5 ${i > 0 ? "hairline-t" : ""}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="mono text-xs text-muted-foreground shrink-0">{e.id.slice(0, 8)}</span>
                      <span className="text-sm font-medium text-foreground truncate">{e.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PlatformChip platform={platform} />
                      <Badge variant={STATUS_VARIANT[e.status] ?? "outline"}>{e.status.toLowerCase()}</Badge>
                      <span className="mono text-2xs text-muted-foreground">{e.kind}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {e.variants.map((v) => (
                      <span
                        key={v.key}
                        className="mono text-2xs px-2 py-1 rounded border border-border bg-surface-1 text-foreground"
                      >
                        {variantLabel(v)}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative h-1.5 flex-1 rounded-full bg-surface-1 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-250"
                        style={{
                          width: `${Math.min(conf, 100)}%`,
                          background:
                            conf >= 95
                              ? "linear-gradient(90deg, hsl(174 62% 36%), hsl(142 55% 40%))"
                              : conf >= 80
                                ? "linear-gradient(90deg, hsl(174 62% 36%), hsl(174 62% 52%))"
                                : "linear-gradient(90deg, hsl(26 85% 48%), hsl(26 85% 58%))",
                        }}
                      />
                    </div>
                    <span className="mono text-xs tabular shrink-0 w-12 text-right text-foreground">{conf}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
