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

export type TickStatus = "idle" | "step_ok" | "step_failed" | "job_done" | "no_handler";

export type TickResult = {
  picked: number;
  executedStepKind: string | null;
  jobId: string | null;
  status: TickStatus;
};

/**
 * Run one tick: find a ready job, execute its next step, commit.
 */
export async function runTick(): Promise<TickResult> {
  const job = await db.jobRun.findFirst({
    where: { status: { in: [JobStatus.PENDING, JobStatus.RUNNING] }, nextAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
  });

  if (!job) return { picked: 0, executedStepKind: null, jobId: null, status: "idle" };

  const step = await db.jobStep.findFirst({
    where: { jobId: job.id, index: job.cursor, status: JobStatus.PENDING },
  });

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

  const priorSteps = await db.jobStep.findMany({
    where: { jobId: job.id, index: { lt: job.cursor }, status: JobStatus.SUCCEEDED },
    select: { index: true, output: true },
  });
  const prior: Record<number, unknown> = {};
  for (const p of priorSteps) prior[p.index] = p.output;

  const ctx: StepContext = {
    jobId: job.id,
    stepIndex: step.index,
    orgId: job.orgId,
    prior,
    tx: db as unknown as Prisma.TransactionClient,
  };

  let result: Awaited<ReturnType<typeof handler>>;
  try {
    result = await handler(step.input, ctx);
  } catch (err) {
    result = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  if (result.ok) {
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

  // Failure path — exponential backoff until max attempts.
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

/**
 * Drain loop — call runTick repeatedly with spacing so a single Railway
 * cron hit (1-min granularity) gives us a 15s effective cadence on queue
 * advancement. Terminates early when the queue is idle; respects a hard
 * deadline below Railway's 60s HTTP ceiling.
 */
export async function drainQueue(opts: {
  maxTicks?: number;
  spacingMs?: number;
  deadlineMs?: number;
} = {}): Promise<{ ticks: TickResult[]; durationMs: number }> {
  const start = Date.now();
  const maxTicks = opts.maxTicks ?? 4;
  const spacingMs = opts.spacingMs ?? 15_000;
  const deadlineMs = opts.deadlineMs ?? 55_000;

  const ticks: TickResult[] = [];
  for (let i = 0; i < maxTicks; i += 1) {
    if (Date.now() - start > deadlineMs) break;

    const tick = await runTick();
    ticks.push(tick);

    if (tick.status === "idle" && tick.picked === 0) break;
    if (i === maxTicks - 1) break;

    const remaining = deadlineMs - (Date.now() - start);
    if (remaining <= spacingMs) break;
    await new Promise((r) => setTimeout(r, spacingMs));
  }

  return { ticks, durationMs: Date.now() - start };
}

/**
 * Fire-and-forget tick. Used by enqueueJob so user-initiated flows run
 * their first step without waiting for the next cron. Never throws.
 */
export function tickInBackground(): Promise<void> {
  return runTick()
    .then(() => undefined)
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[jobs] background tick failed:", err instanceof Error ? err.message : err);
    });
}
