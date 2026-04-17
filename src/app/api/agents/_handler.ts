import { NextResponse } from "next/server";
import type { AgentKind } from "@prisma/client";
import { dispatch } from "@/agents/dispatcher";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkDailyCap, isCapOverride } from "@/lib/cost-caps";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Shared agent-route handler. Resolves the current user → their primary org,
 * enforces rate limit + daily cost cap, then dispatches the agent.
 *
 * Unauthenticated calls in development land on the demo org so the wizard
 * works without sign-in. The demo org has the STARTER cost cap.
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
    const demo = await db.organization
      .upsert({
        where: { slug: "demo" },
        update: {},
        create: { slug: "demo", name: "Demo" },
      })
      .catch(() => null);
    if (demo) orgId = demo.id;
  }

  if (!orgId) {
    return NextResponse.json({ ok: false, error: "No organization context" }, { status: 400 });
  }

  // ── 1. Rate limit (per-org, per-agent-kind bucket) ─────────────────
  const limited = await rateLimit(`agent:${orgId}:${kind}`, {
    limit: 30,
    windowSec: 60,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: `Rate limit exceeded. Retry in ${limited.retryAfterSec}s.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // ── 2. Daily AI cost cap ──────────────────────────────────────────
  const override = isCapOverride(req.headers.get("x-eiaaw-override"));
  if (!override) {
    const cap = await checkDailyCap(orgId);
    if (!cap.ok) {
      return NextResponse.json(
        { ok: false, error: cap.reason, spentUsd: cap.spentUsd, capUsd: cap.capUsd },
        { status: 402, headers: { "X-EIAAW-Cap-Reason": "daily-ai-cost" } },
      );
    }
  }

  // ── 3. Dispatch ───────────────────────────────────────────────────
  const result = await dispatch(kind, { orgId, userId, executionMode: "ASSISTED" }, input);
  return NextResponse.json(result);
}
