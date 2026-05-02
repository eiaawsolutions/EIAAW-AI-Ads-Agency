import Link from "next/link";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformChip } from "@/components/platform/chip";
import { Plus } from "lucide-react";
import { getActiveOrgOrRedirect } from "@/lib/active-org";
import { db } from "@/lib/db";

export const metadata = { title: "Campaigns" };
export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  LIVE: "live",
  SCHEDULED: "default",
  DRAFT: "outline",
  PAUSED: "warn",
  ARCHIVED: "outline",
} as const;

export default async function CampaignsPage() {
  const ctx = await getActiveOrgOrRedirect();

  const start30 = new Date();
  start30.setDate(start30.getDate() - 30);

  const campaigns = await db.campaign.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { updatedAt: "desc" },
    include: {
      metrics: {
        where: { date: { gte: start30 } },
        select: { spend: true, revenue: true },
      },
    },
  });

  const rows = campaigns.map((c) => {
    const spent = c.metrics.reduce((a, m) => a + m.spend, 0) / 100;
    const revenue = c.metrics.reduce((a, m) => a + m.revenue, 0) / 100;
    const roas = spent > 0 ? revenue / spent : 0;
    const daysLeft = c.endAt ? Math.max(0, Math.ceil((c.endAt.getTime() - Date.now()) / 86_400_000)) : null;
    const budget = c.totalBudget
      ? c.totalBudget / 100
      : c.dailyBudget && daysLeft
        ? (c.dailyBudget / 100) * daysLeft
        : c.dailyBudget
          ? (c.dailyBudget / 100) * 30
          : 0;
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      platforms: c.platforms.map((p) => p.toLowerCase()),
      spent,
      budget,
      roas,
    };
  });

  const liveCount = rows.filter((r) => r.status === "LIVE").length;

  return (
    <>
      <DashboardTopbar title="Campaigns" subtitle={`${rows.length} total · ${liveCount} live`} />
      <main className="p-6 space-y-6">
        <div className="flex justify-end">
          <Button asChild variant="secondary">
            <Link href="/onboarding">
              <Plus className="h-3.5 w-3.5" /> New campaign
            </Link>
          </Button>
        </div>
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {rows.length === 0 ? (
            <div className="px-5 py-16 text-center text-xs text-muted-foreground">
              No campaigns yet.{" "}
              <Link href="/onboarding" className="text-primary hover:underline">
                Run the wizard
              </Link>{" "}
              to create your first.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="hairline-b">
                  <th className="text-left eyebrow px-5 py-2.5">Campaign</th>
                  <th className="text-left eyebrow px-5 py-2.5">Status</th>
                  <th className="text-left eyebrow px-5 py-2.5">Platforms</th>
                  <th className="text-right eyebrow px-5 py-2.5">Spent / Budget (30d)</th>
                  <th className="text-right eyebrow px-5 py-2.5">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={c.id} className={`hover:bg-surface-1/60 transition-colors duration-150 ${i > 0 ? "hairline-t" : ""}`}>
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                      <Link href={`/dashboard/campaigns/${c.id}`} className="hover:text-primary hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={STATUS_VARIANT[c.status] ?? "outline"}>{c.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {c.platforms.map((p) => (
                          <PlatformChip key={p} platform={p} />
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 mono text-xs tabular text-right text-foreground/90">
                      ${Math.round(c.spent).toLocaleString()} / ${Math.round(c.budget).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 mono text-xs tabular text-right text-primary">
                      {c.roas > 0 ? `${c.roas.toFixed(2)}×` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
