import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveOrgId } from "@/lib/resolve-org";

/**
 * GET /api/jobs/:id
 *
 * Lookup a job by id OR correlationId (the UI polls this — the wizard
 * enqueues with a correlationId so it doesn't need to store a returned id).
 * Returns status, cursor, per-step results.
 *
 * Auth model:
 *   - Authenticated: org-scoped to the caller's primary membership
 *   - Unauthenticated: falls back to the demo org (slug "demo") so the
 *     wizard's polling works before the user signs in. This mirrors the
 *     /api/agents/_handler demo-org behavior and carries the same caveat
 *     (demo data is shared, not isolated).
 *   - correlationId acts as a weak bearer — unguessable at 8+36 random
 *     chars, but not a hard secret. Production should switch to an
 *     explicit auth-required mode once we require sign-up to start the
 *     wizard.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const resolved = await resolveOrgId();
  if (!resolved) return NextResponse.json({ error: "no org context" }, { status: 400 });
  const { orgId } = resolved;

  const { id } = await ctx.params;

  const job = await db.jobRun.findFirst({
    where: {
      orgId,
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
