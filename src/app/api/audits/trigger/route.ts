import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { enqueueAuditFor } from "@/jobs/audit-trigger";

/**
 * POST /api/audits/trigger
 *
 * Manually enqueue an ads-audit run for the caller's primary org. Subject
 * to the 24h dedup floor in enqueueAuditFor — repeated clicks within 24h
 * return { enqueued:false, reason } and don't burn AI budget.
 *
 * Returns the JobRun id so the client can poll /api/jobs/:id for status.
 */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user && "id" in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await db.membership.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (!m) return NextResponse.json({ error: "No org" }, { status: 400 });

  // Per-org button mash protection on top of the 24h floor.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const limited = await rateLimit(`audit-trigger:${m.orgId}:${ip}`, { limit: 5, windowSec: 60 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Slow down. Retry in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const result = await enqueueAuditFor(m.orgId, "manual", { actorId: userId });
  return NextResponse.json(result, { status: result.enqueued ? 202 : 409 });
}
