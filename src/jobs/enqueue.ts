import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { EnqueueInput } from "./types";

/**
 * Enqueue a new JobRun with its steps. Returns the JobRun id.
 *
 * Steps are inserted in a single transaction so the pipeline is visible
 * atomically to the poller. `correlationId` lets the caller poll
 * /api/jobs/:correlationId without having to track the generated job id.
 */
export async function enqueueJob(spec: EnqueueInput): Promise<{ id: string; correlationId: string | null }> {
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

  return { id: job.id, correlationId: job.correlationId };
}
