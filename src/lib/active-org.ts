import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";

export type ActiveOrg = {
  userId: string;
  orgId: string;
  role: "OWNER" | "ADMIN" | "STRATEGIST" | "ANALYST" | "VIEWER";
  org: {
    id: string;
    name: string;
    slug: string;
    plan: "STARTER" | "GROWTH" | "ENTERPRISE";
    executionMode: "AUTONOMOUS" | "ASSISTED" | "ENTERPRISE";
  };
  subscription: {
    status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE";
    currentPeriodEnd: Date | null;
    plan: "STARTER" | "GROWTH" | "ENTERPRISE";
  } | null;
};

/**
 * Server-component helper used by every dashboard page. Strict gating:
 *   1. No session → /signin
 *   2. Session but no membership → /pricing (account exists but workspace
 *      was nuked, or webhook hasn't landed yet)
 *   3. Membership but no active/trialing subscription → /pricing
 *   4. PAST_DUE / INCOMPLETE → /dashboard/billing-issue (lets them update
 *      payment method without leaving the app)
 *
 * Previously this helper auto-provisioned a personal Org on first call.
 * That was removed as part of the strict-checkout invariant — orgs are
 * created only by the Stripe webhook.
 */
export async function getActiveOrgOrRedirect(): Promise<ActiveOrg> {
  const session = await auth();
  const userId = session?.user && "id" in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) redirect("/signin");

  const membership = await db.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      org: { include: { subscription: true } },
    },
  });
  if (!membership) redirect("/pricing?error=no_workspace");

  const sub = membership.org.subscription;
  if (!sub) redirect("/pricing?error=no_subscription");

  if (sub.status === "CANCELED") redirect("/pricing?error=canceled");
  if (sub.status === "PAST_DUE" || sub.status === "INCOMPLETE") {
    redirect("/dashboard/billing-issue");
  }

  return {
    userId,
    orgId: membership.orgId,
    role: membership.role,
    org: {
      id: membership.org.id,
      name: membership.org.name,
      slug: membership.org.slug,
      plan: membership.org.plan,
      executionMode: membership.org.executionMode,
    },
    subscription: {
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      plan: sub.plan,
    },
  };
}

export async function getActiveOrgOrNull(): Promise<ActiveOrg | null> {
  const session = await auth();
  const userId = session?.user && "id" in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) return null;

  const membership = await db.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { org: { include: { subscription: true } } },
  });
  if (!membership) return null;

  const sub = membership.org.subscription;
  if (!sub) return null;
  if (sub.status === "CANCELED" || sub.status === "PAST_DUE" || sub.status === "INCOMPLETE") {
    return null;
  }

  return {
    userId,
    orgId: membership.orgId,
    role: membership.role,
    org: {
      id: membership.org.id,
      name: membership.org.name,
      slug: membership.org.slug,
      plan: membership.org.plan,
      executionMode: membership.org.executionMode,
    },
    subscription: {
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      plan: sub.plan,
    },
  };
}
