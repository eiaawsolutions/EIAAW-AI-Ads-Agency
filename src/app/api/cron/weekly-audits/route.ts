import { NextResponse } from "next/server";
import { JobStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { enqueueAuditFor } from "@/jobs/audit-trigger";

/**
 * POST /api/cron/weekly-audits
 *
 * Weekly audit sweep. Iterates orgs and enqueues an ads-audit run for any
 * org whose latest successful audit is older than 7 days (or that has
 * never run one).
 *
 * Auth: shared secret via X-EIAAW-Worker-Secret header — same pattern as
 * /api/worker/tick. Configure as a Railway Cron (suggested: weekly Mon
 * 02:00 UTC). The endpoint itself decides which orgs are due, so the cron
 * cadence is independent of the per-org audit cadence.
 *
 * The 24h dedup floor in enqueueAuditFor protects against accidental
 * double-firing if the cron runs more often than weekly.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1_000;

export async function POST(req: Request) {
  const secret = process.env.EIAAW_WORKER_SECRET;
  if (secret && req.headers.get("x-eiaaw-worker-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cap at 100 orgs per tick — Railway HTTP ceiling is 60s and each enqueue
  // does a few small writes. At 100 orgs we use < 5s. Above that scale,
  // partition by hash of orgId across multiple cron schedules.
  const orgs = await db.organization.findMany({
    select: { id: true, slug: true },
    take: 100,
  });

  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);
  const results: Array<{ orgId: string; slug: string; action: "enqueued" | "skipped" | "fresh"; jobId?: string; reason?: string }> = [];

  for (const org of orgs) {
    const lastSuccess = await db.jobRun.findFirst({
      where: {
        orgId: org.id,
        kind: "AGENT_CHAIN",
        correlationId: { startsWith: "audit:" },
        status: JobStatus.SUCCEEDED,
      },
      orderBy: { endedAt: "desc" },
      select: { endedAt: true, createdAt: true },
    });
    const lastRunAt = lastSuccess?.endedAt ?? lastSuccess?.createdAt ?? null;

    if (lastRunAt && lastRunAt > cutoff) {
      results.push({ orgId: org.id, slug: org.slug, action: "fresh" });
      continue;
    }

    const r = await enqueueAuditFor(org.id, "weekly");
    if (r.enqueued) {
      results.push({ orgId: org.id, slug: org.slug, action: "enqueued", jobId: r.jobId });
    } else {
      results.push({ orgId: org.id, slug: org.slug, action: "skipped", reason: r.reason });
    }
  }

  const summary = {
    total: results.length,
    enqueued: results.filter((r) => r.action === "enqueued").length,
    skipped: results.filter((r) => r.action === "skipped").length,
    fresh: results.filter((r) => r.action === "fresh").length,
  };

  return NextResponse.json({ ok: true, ...summary, results });
}

export async function GET(req: Request) {
  return POST(req);
}
