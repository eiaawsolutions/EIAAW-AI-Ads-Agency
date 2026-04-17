import { NextResponse } from "next/server";
import type { AgentKind } from "@prisma/client";
import { dispatch } from "@/agents/dispatcher";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Shared agent-route handler. Resolves the current user → their primary org,
 * then dispatches the requested agent. Persists a full AgentRun row.
 *
 * Unauthenticated calls in development land on the demo org so the wizard
 * works without sign-in; production should enforce `auth()`.
 */
export async function handleAgentPost(kind: AgentKind, req: Request) {
  const input = await req.json().catch(() => ({}));
  const session = await auth();
  const userId = session?.user && "id" in session.user ? (session.user as { id: string }).id : undefined;

  let orgId = process.env.DEMO_ORG_ID ?? "";
  if (userId) {
    const m = await db.membership.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
    if (m) orgId = m.orgId;
  } else {
    // Create/reuse a demo org so agents can run and persist runs.
    const demo = await db.organization.upsert({
      where: { slug: "demo" },
      update: {},
      create: { slug: "demo", name: "Demo" },
    }).catch(() => null);
    if (demo) orgId = demo.id;
  }

  if (!orgId) {
    return NextResponse.json({ ok: false, error: "No organization context" }, { status: 400 });
  }

  const result = await dispatch(kind, { orgId, userId, executionMode: "ASSISTED" }, input);
  return NextResponse.json(result);
}
