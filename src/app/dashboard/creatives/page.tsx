import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { getActiveOrgOrRedirect } from "@/lib/active-org";
import { db } from "@/lib/db";

export const metadata = { title: "Creatives" };
export const dynamic = "force-dynamic";

export default async function CreativesPage() {
  const ctx = await getActiveOrgOrRedirect();

  const start30 = new Date();
  start30.setDate(start30.getDate() - 30);

  const ads = await db.ad.findMany({
    where: { adSet: { campaign: { orgId: ctx.orgId } } },
    include: {
      metrics: {
        where: { date: { gte: start30 } },
        select: { impressions: true, clicks: true, spend: true, revenue: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 48,
  });

  const rows = ads.map((a) => {
    const impressions = a.metrics.reduce((s, m) => s + m.impressions, 0);
    const clicks = a.metrics.reduce((s, m) => s + m.clicks, 0);
    const spend = a.metrics.reduce((s, m) => s + m.spend, 0) / 100;
    const revenue = a.metrics.reduce((s, m) => s + m.revenue, 0) / 100;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const roas = spend > 0 ? revenue / spend : 0;
    return {
      id: a.id,
      label: a.headline ?? a.cta ?? "Untitled creative",
      imageUrl: a.imageUrl,
      ctr,
      roas,
      status: a.status,
    };
  });

  return (
    <>
      <DashboardTopbar title="Creatives" subtitle={`${rows.length} creatives · last 30 days`} />
      <main className="p-6 space-y-6">
        <div className="flex justify-end">
          <Button variant="secondary">
            <Sparkles className="h-3.5 w-3.5" /> Generate batch
          </Button>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-5 py-16 text-center text-xs text-muted-foreground">
            No creatives yet. Generated ads from <span className="mono">ads-generate</span> and{" "}
            <span className="mono">ads-photoshoot</span> will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {rows.map((c) => (
              <div key={c.id} className="rounded-lg border border-border overflow-hidden group bg-card">
                <div className="aspect-square bg-surface-2 relative overflow-hidden">
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.imageUrl}
                      alt={c.label}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-250 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 transition-transform duration-250 group-hover:scale-[1.02]"
                      style={{
                        background: [
                          "radial-gradient(ellipse at 30% 20%, hsl(174 62% 40% / 0.38), transparent 60%)",
                          "radial-gradient(ellipse at 80% 70%, hsl(26 80% 60% / 0.28), transparent 55%)",
                          "linear-gradient(135deg, hsl(36 32% 93%), hsl(34 26% 89%))",
                        ].join(","),
                      }}
                    />
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant={c.status === "LIVE" ? "live" : "outline"}>{c.status}</Badge>
                  </div>
                </div>
                <div className="px-3 py-2.5 hairline-t">
                  <div className="flex items-center justify-between">
                    <span className="mono text-2xs text-muted-foreground truncate" title={c.id}>
                      {c.id.slice(0, 8)}
                    </span>
                    <span className="mono text-xs text-primary tabular">
                      {c.roas > 0 ? `${c.roas.toFixed(2)}×` : "—"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-2xs text-muted-foreground">CTR</span>
                    <span className="mono text-2xs tabular text-muted-foreground">
                      {c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-2xs text-foreground/80 line-clamp-1">{c.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
