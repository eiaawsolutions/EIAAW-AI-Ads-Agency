import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { tickInBackground } from "./executor";
import type { EnqueueInput } from "./types";

/**
 * Enqueue a new JobRun with its steps. Returns the JobRun id.
 *
 * Steps are inserted in a single transaction so the pipeline is visible
 * atomically to the poller. `correlationId` lets the caller poll
 * /api/jobs/:correlationId without having to track the generated job id.
 *
 * After persist, fires a fire-and-forget background tick so interactive
 * flows (wizard) run their first step immediately rather than waiting up
 * to one minute for the next Railway cron. Opt out via fireImmediate:false
 * for tests that want deterministic control over tick timing.
 */
export async function enqueueJob(
  spec: EnqueueInput & { fireImmediate?: boolean },
): Promise<{ id: string; correlationId: string | null }> {
  if (spec.steps.length === 0) throw new Error("enqueueJob: at least one step required");

  const job = await db.$transaction(async (tx) => {
    const created = await tx.jobRun.create({
      data: {
        orgId: spec.orgId,
        kind: spec.kind,
        input: spec.input as Prisma.InputJsonValue,
        correlationId: spec.correlationId,
      },
    });
    await tx.jobStep.createMany({
      data: spec.steps.map((s, i) => ({
        jobId: created.id,
        index: i,
        kind: s.kind,
        input: s.input as Prisma.InputJsonValue,
      })),
    });
    return created;
  });

  if (spec.fireImmediate !== false) {
    // Detached — do NOT await. The caller's request returns immediately.
    // The Node runtime keeps the event loop alive long enough on Railway
    // to complete the tick because we're inside an HTTP handler.
    void tickInBackground();
  }

  return { id: job.id, correlationId: job.correlationId };
}
