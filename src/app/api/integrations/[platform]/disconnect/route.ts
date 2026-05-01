import { NextResponse } from "next/server";
import { Platform, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveAuthedOrg } from "@/lib/resolve-org";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/integrations/:platform/disconnect
 *
 * Marks every Integration row for this org+platform as revoked and nulls
 * out the encrypted tokens. Rows are kept (not deleted) so AgentRun /
 * AuditLog history that references them stays meaningful.
 *
 * Auth: OWNER or ADMIN only. Tokens are sensitive, and a Viewer
 * accidentally disconnecting Meta would silently break performance
 * agents until someone notices.
 *
 * Rate limit: 5/min per org+IP. Disconnect is fast and can be replayed
 * by a confused user, but we don't want a click-storm to spam the audit
 * log.
 *
 * No real OAuth-revocation call here — providers expire un-refreshed
 * tokens on their own and the user can revoke from the provider UI if
 * they want a hard cut. Adding live revocation per-platform is a
 * separate, riskier piece of work.
 */
export async function POST(req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const orgCtx = await resolveAuthedOrg();
  if (!orgCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (orgCtx.role !== "OWNER" && orgCtx.role !== "ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  const { orgId, userId } = orgCtx;

  const { platform } = await ctx.params;
  const p = platform.toUpperCase() as Platform;
  if (!(p in Platform)) return NextResponse.json({ error: "Unknown platform" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const limited = await rateLimit(`integration-disconnect:${orgId}:${ip}`, {
    limit: 5,
    windowSec: 60,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many disconnect attempts. Retry in ${limited.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const updated = await db.integration.updateMany({
    where: { orgId, platform: p, status: { not: "revoked" } },
    data: {
      status: "revoked",
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    },
  });

  if (updated.count === 0) {
    return NextResponse.json(
      { ok: true, count: 0, message: "Nothing to disconnect — no active integrations for this platform." },
      { status: 200 },
    );
  }

  await db.auditLog
    .create({
      data: {
        orgId,
        actorId: userId,
        action: "integration.disconnect",
        target: p,
        meta: { platform: p, count: updated.count } as Prisma.InputJsonValue,
      },
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, count: updated.count, platform: p });
}
