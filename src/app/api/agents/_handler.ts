import { NextResponse } from "next/server";
import type { AgentKind } from "@prisma/client";
import { dispatch } from "@/agents/dispatcher";
import { checkDailyCap, isCapOverride } from "@/lib/cost-caps";
import { rateLimit } from "@/lib/rate-limit";
import { resolveOrgId } from "@/lib/resolve-org";

/**
 * Shared agent-route handler. Resolves the current user → their primary org,
 * enforces rate limit + daily cost cap, then dispatches the agent.
 *
 * Auth required: only users with an active subscription (membership +
 * Subscription.status IN [TRIALING, ACTIVE]) reach an agent. Unauthed or
 * subscription-less callers get 401. The previous demo-org fallback was
 * removed as part of the strict-checkout invariant.
 */
export async function handleAgentPost(kind: AgentKind, req: Request) {
  const input = await req.json().catch(() => ({}));
  const ctx = await resolveOrgId();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { orgId, userId } = ctx;

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
