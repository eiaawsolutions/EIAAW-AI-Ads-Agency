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
 * Resolve the org context for an API request.
 *
 * If the caller is authenticated but has no Membership yet (first sign-in
 * via Google OAuth, or any user the seeder didn't pre-provision), this
 * auto-creates a personal Organization + OWNER Membership so the wizard,
 * audits, and other org-scoped routes don't dead-end on
 * "No organization context".
 *
 * Unauthenticated callers fall back to DEMO_ORG_ID, then to upserting the
 * "demo" org — preserves the existing wizard-without-sign-in behaviour.
 *
 * Returns null only when we genuinely can't establish a tenant (e.g. db
 * unavailable). Callers should respond 400 in that case.
 */
export async function resolveOrgId(): Promise<{ orgId: string; userId?: string } | null> {
  const authed = await resolveAuthedOrg();
  if (authed) return { orgId: authed.orgId, userId: authed.userId };

  // Unauthenticated — preserve demo-org fallback for the public wizard.
  const envOrgId = process.env.DEMO_ORG_ID;
  if (envOrgId) return { orgId: envOrgId };

  const demo = await db.organization
    .upsert({
      where: { slug: "demo" },
      update: {},
      create: { slug: "demo", name: "Demo" },
      select: { id: true },
    })
    .catch(() => null);
  return demo ? { orgId: demo.id } : null;
}

/**
 * Authed-only variant. Returns the caller's primary membership with the
 * full org row. Auto-provisions a personal org + OWNER membership on first
 * call. Returns null when the caller is unauthenticated — the route should
 * respond 401.
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
  if (existing) {
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

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) return null;

  const baseSlug = slugify(user.email ?? user.name ?? `user-${userId.slice(0, 8)}`);
  const orgName = user.name?.trim() || user.email?.split("@")[0] || "Workspace";

  const created = await db.$transaction(async (tx) => {
    const slug = await uniqueSlug(tx, baseSlug);
    const org = await tx.organization.create({
      data: { slug, name: orgName, plan: Plan.STARTER },
    });
    await tx.membership.create({
      data: { userId, orgId: org.id, role: Role.OWNER },
    });
    return org;
  });

  return {
    userId,
    orgId: created.id,
    role: Role.OWNER,
    org: {
      id: created.id,
      slug: created.slug,
      name: created.name,
      plan: created.plan,
      executionMode: created.executionMode,
    },
  };
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/@.*$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "workspace"
  );
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function uniqueSlug(tx: Tx, base: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const taken = await tx.organization.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
