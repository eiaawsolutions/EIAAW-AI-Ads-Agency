import { Plan, Role } from "@prisma/client";
import type { ExecutionMode } from "@prisma/client";
import { auth } from "./auth";
import { db } from "./db";

export type AuthedOrg = {
  userId: string;
  orgId: string;
  role: Role;
  org: {
    id: string;
    slug: string;
    name: string;
    plan: Plan;
    executionMode: ExecutionMode;
  };
};

/**
 * Resolve an org for any caller — authenticated only after the strict-
 * checkout cutover. Auto-org-provisioning was removed because it created
 * orgs without a Subscription, defeating the checkout invariant. The DEMO_ORG_ID
 * fallback is also gone: every code path that previously relied on it
 * (the public wizard) must now require sign-in.
 *
 * Returns null if the caller is unauthenticated OR has no membership.
 * Callers should respond 401/403 in that case.
 */
export async function resolveOrgId(): Promise<{ orgId: string; userId?: string } | null> {
  const authed = await resolveAuthedOrg();
  if (!authed) return null;
  return { orgId: authed.orgId, userId: authed.userId };
}

/**
 * Authed-only variant. Returns the caller's primary membership with the
 * full org row. NEVER auto-creates anything — Stripe checkout webhook is
 * the only path that may create User/Org/Membership/Subscription/Brand.
 *
 * Returns null when the caller is unauthenticated OR has no membership.
 * The route should respond 401 (unauth) or 403 (signed in but no org).
 */
export async function resolveAuthedOrg(): Promise<AuthedOrg | null> {
  const session = await auth();
  const userId =
    session?.user && "id" in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) return null;

  const existing = await db.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { org: true },
  });
  if (!existing) return null;

  return {
    userId,
    orgId: existing.orgId,
    role: existing.role,
    org: {
      id: existing.org.id,
      slug: existing.org.slug,
      name: existing.org.name,
      plan: existing.org.plan,
      executionMode: existing.org.executionMode,
    },
  };
}
