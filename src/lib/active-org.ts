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
};

export async function getActiveOrgOrRedirect(): Promise<ActiveOrg> {
  const session = await auth();
  const userId = session?.user && "id" in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) redirect("/signin");

  const membership = await db.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { org: true },
  });
  if (!membership) redirect("/onboarding");

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
  };
}

export async function getActiveOrgOrNull(): Promise<ActiveOrg | null> {
  const session = await auth();
  const userId = session?.user && "id" in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) return null;

  const membership = await db.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { org: true },
  });
  if (!membership) return null;

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
  };
}
