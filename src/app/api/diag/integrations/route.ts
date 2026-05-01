import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Temporary diagnostic — auth-required. Returns the row shape the
 * integrations page is matching on, plus all memberships for the
 * caller, so we can spot orgId mismatches between callback writes
 * and page reads. Token bytes are NOT returned, only length + 3-char prefix.
 *
 * Remove after Meta live path is verified.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user && "id" in session.user
    ? (session.user as { id: string }).id
    : null;
  if (!userId) return NextResponse.json({ error: "unauthed" }, { status: 401 });

  const memberships = await db.membership.findMany({
    where: { userId },
    select: {
      orgId: true,
      role: true,
      createdAt: true,
      org: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const orgIds = memberships.map((m) => m.orgId);
  const integrations = await db.integration.findMany({
    where: { orgId: { in: orgIds } },
    select: {
      id: true,
      orgId: true,
      platform: true,
      externalId: true,
      displayName: true,
      status: true,
      scopes: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      accessToken: true,
      refreshToken: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    userId,
    memberships,
    integrations: integrations.map((i) => ({
      ...i,
      accessToken: i.accessToken
        ? `${i.accessToken.slice(0, 3)}…len=${i.accessToken.length}`
        : null,
      refreshToken: i.refreshToken
        ? `len=${i.refreshToken.length}`
        : null,
    })),
    time: new Date().toISOString(),
  });
}
