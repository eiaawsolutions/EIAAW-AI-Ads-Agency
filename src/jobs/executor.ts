import { JobStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getHandler } from "./registry";
import { registerBuiltinHandlers } from "./handlers";
import {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_RETRY_BASE_SEC,
  type StepContext,
} from "./types";

registerBuiltinHandlers();

/**
 * Run one tick of the job queue: find a ready job, execute its next step,
 * commit. Returns a summary for observability.
 *
 * Called from /api/_internal/worker/tick on a cron. Safe to call
 * concurrently at low volume — Postgres handles the UPDATE serialization.
 * For higher throughput we'd need SELECT ... FOR UPDATE SKIP LOCKED, which
 * Prisma doesn't expose directly.
 */
export async function runTick(): Promise<{
  picked: number;
  executedStepKind: string | null;
  jobId: string | null;
  status: "idle" | "step_ok" | "step_failed" | "job_done" | "no_handler";
}> {
  const job = await db.jobRun.findFirst({
    where: { status: { in: [JobStatus.PENDING, JobStatus.RUNNING] }, nextAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
  });

  if (!job) return { picked: 0, executedStepKind: null, jobId: null, status: "idle" };

  const step = await db.jobStep.findFirst({
    where: { jobId: job.id, index: job.cursor, status: JobStatus.PENDING },
  });

  // No pending step at cursor → job is done (or stuck).
  if (!step) {
    const outstanding = await db.jobStep.count({
      where: { jobId: job.id, status: { in: [JobStatus.PENDING, JobStatus.RUNNING] } },
    });
    if (outstanding === 0) {
      await db.jobRun.update({
        where: { id: job.id },
        data: { status: JobStatus.SUCCEEDED, endedAt: new Date() },
      });
      return { picked: 1, executedStepKind: null, jobId: job.id, status: "job_done" };
    }
    // State inconsistency — shouldn't happen but fail loudly.
    return { picked: 1, executedStepKind: null, jobId: job.id, status: "idle" };
  }

  const handler = getHandler(step.kind);
  if (!handler) {
    await db.jobStep.update({
      where: { id: step.id },
      data: {
        status: JobStatus.FAILED,
        error: `no handler for kind "${step.kind}"`,
        endedAt: new Date(),
      },
    });
    await db.jobRun.update({
      where: { id: job.id },
      data: { status: JobStatus.FAILED, error: `no handler for step ${step.index} (${step.kind})`, endedAt: new Date() },
    });
    return { picked: 1, executedStepKind: step.kind, jobId: job.id, status: "no_handler" };
  }

  // Mark step + job RUNNING in a single transaction.
  await db.$transaction([
    db.jobStep.update({
      where: { id: step.id },
      data: { status: JobStatus.RUNNING, startedAt: new Date(), attempts: step.attempts + 1 },
    }),
    db.jobRun.update({
      where: { id: job.id },
      data: { status: JobStatus.RUNNING, attempts: job.attempts + 1, startedAt: job.startedAt ?? new Date() },
    }),
  ]);

  // Build context: pass outputs of all prior steps indexed by their position.
  const priorSteps = await db.jobStep.findMany({
    where: { jobId: job.id, index: { lt: job.cursor }, status: JobStatus.SUCCEEDED },
    select: { index: true, output: true },
  });
  const prior: Record<number, unknown> = {};
  for (const p of priorSteps) prior[p.index] = p.output;

  let result: Awaited<ReturnType<typeof handler>>;
  const ctx: StepContext = {
    jobId: job.id,
    stepIndex: step.index,
    orgId: job.orgId,
    prior,
    tx: db as unknown as Prisma.TransactionClient,
  };

  try {
    result = await handler(step.input, ctx);
  } catch (err) {
    result = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (result.ok) {
    // Advance cursor + save step output. If this was the last step, mark job done.
    await db.$transaction(async (tx) => {
      await tx.jobStep.update({
        where: { id: step.id },
        data: {
          status: JobStatus.SUCCEEDED,
          output: (result.output ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull,
          endedAt: new Date(),
        },
      });
      const totalSteps = await tx.jobStep.count({ where: { jobId: job.id } });
      const isLast = step.index + 1 >= totalSteps;
      await tx.jobRun.update({
        where: { id: job.id },
        data: {
          cursor: step.index + 1,
          status: isLast ? JobStatus.SUCCEEDED : JobStatus.PENDING,
          nextAt: new Date(),
          endedAt: isLast ? new Date() : null,
        },
      });
    });
    return { picked: 1, executedStepKind: step.kind, jobId: job.id, status: "step_ok" };
  }

  // Failure path — retry with exponential backoff until max attempts.
  const attempts = step.attempts + 1;
  const exhausted = attempts >= DEFAULT_MAX_ATTEMPTS;
  const backoffSec =
    result.retryInSec ?? Math.min(DEFAULT_RETRY_BASE_SEC * Math.pow(2, attempts - 1), 900);

  if (exhausted) {
    await db.$transaction([
      db.jobStep.update({
        where: { id: step.id },
        data: { status: JobStatus.FAILED, error: result.error, endedAt: new Date() },
      }),
      db.jobRun.update({
        where: { id: job.id },
        data: { status: JobStatus.FAILED, error: `step ${step.index} (${step.kind}): ${result.error}`, endedAt: new Date() },
      }),
    ]);
  } else {
    await db.$transaction([
      db.jobStep.update({
        where: { id: step.id },
        data: { status: JobStatus.PENDING, error: result.error, endedAt: null },
      }),
      db.jobRun.update({
        where: { id: job.id },
        data: { status: JobStatus.PENDING, nextAt: new Date(Date.now() + backoffSec * 1000) },
      }),
    ]);
  }

  return { picked: 1, executedStepKind: step.kind, jobId: job.id, status: "step_failed" };
}
