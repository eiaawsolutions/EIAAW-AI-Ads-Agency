import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsageWidget } from "@/components/dashboard/usage-widget";
import { OrgSettingsForm } from "@/components/dashboard/org-settings-form";
import { getActiveOrgOrRedirect } from "@/lib/active-org";
import { db } from "@/lib/db";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const PLAN_PRICE_USD: Record<"STARTER" | "GROWTH" | "ENTERPRISE", string> = {
  STARTER: "$299/mo",
  GROWTH: "$1,499/mo",
  ENTERPRISE: "Custom",
};

const STATUS_VARIANT = {
  TRIALING: "default",
  ACTIVE: "live",
  PAST_DUE: "warn",
  CANCELED: "danger",
  INCOMPLETE: "warn",
} as const;

export default async function SettingsPage() {
  const ctx = await getActiveOrgOrRedirect();
  const subscription = await db.subscription.findUnique({ where: { orgId: ctx.orgId } });
  const canEdit = ctx.role === "OWNER" || ctx.role === "ADMIN";

  return (
    <>
      <DashboardTopbar title="Settings" subtitle="Organization · billing · execution mode" />
      <main className="p-6 space-y-6 max-w-2xl">
        <UsageWidget />

        <OrgSettingsForm
          initialName={ctx.org.name}
          initialSlug={ctx.org.slug}
          initialMode={ctx.org.executionMode}
          canEdit={canEdit}
        />

        <section className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <span className="eyebrow">Subscription</span>
            <Badge variant={STATUS_VARIANT[subscription?.status ?? "TRIALING"] ?? "default"}>
              {subscription?.status ?? "TRIALING"}
            </Badge>
          </div>
          <div className="p-5">
            <div className="flex items-baseline gap-2">
              <span className="display text-2xl text-foreground">
                {(subscription?.plan ?? ctx.org.plan).charAt(0) +
                  (subscription?.plan ?? ctx.org.plan).slice(1).toLowerCase()}
              </span>
              <span className="mono text-xs text-muted-foreground">
                {PLAN_PRICE_USD[subscription?.plan ?? ctx.org.plan]}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {subscription?.currentPeriodEnd
                ? `Renews ${subscription.currentPeriodEnd.toISOString().slice(0, 10)}`
                : "No renewal scheduled"}
            </p>
            {subscription?.stripeCustomerId ? (
              <Button variant="subtle" size="sm" className="mt-4" asChild>
                <a href="/api/stripe/portal" target="_blank" rel="noreferrer">
                  Manage in Stripe
                </a>
              </Button>
            ) : (
              <Button variant="subtle" size="sm" className="mt-4" asChild>
                <a href="/pricing">View plans</a>
              </Button>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
