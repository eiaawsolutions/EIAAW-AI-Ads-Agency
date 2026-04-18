import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/jobs/:id
 *
 * Lookup a job by id OR correlationId (the UI polls this — the wizard
 * enqueues with a correlationId so it doesn't need to store a returned id).
 * Returns status, cursor, per-step results. 404 if not found or not in
 * caller's org.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const membership = await db.membership.findFirst({ where: { userId } });
  if (!membership) return NextResponse.json({ error: "No org" }, { status: 400 });

  const { id } = await ctx.params;

  const job = await db.jobRun.findFirst({
    where: {
      orgId: membership.orgId,
      OR: [{ id }, { correlationId: id }],
    },
    include: {
      steps: {
        orderBy: { index: "asc" },
        select: {
          index: true,
          kind: true,
          status: true,
          output: true,
          error: true,
          attempts: true,
          startedAt: true,
          endedAt: true,
        },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    job: {
      id: job.id,
      kind: job.kind,
      status: job.status,
      cursor: job.cursor,
      attempts: job.attempts,
      error: job.error,
      output: job.output,
      correlationId: job.correlationId,
      startedAt: job.startedAt,
      endedAt: job.endedAt,
      createdAt: job.createdAt,
      steps: job.steps,
    },
  });
}
