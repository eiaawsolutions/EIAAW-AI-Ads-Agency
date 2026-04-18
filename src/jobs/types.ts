/**
 * Durable job primitives.
 *
 * A JobRun is a pipeline of JobSteps. Each step has a kind ("agent.ads-dna",
 * "platform.meta.launch", ...) that resolves to a handler in the registry.
 * Handlers are idempotent — given the same input they return the same output.
 * The runtime persists every result so retries never re-do successful work.
 *
 * Design:
 *   - Jobs live in Postgres (JobRun/JobStep). No Redis, no Inngest SDK.
 *   - A single tick endpoint does the work — pick ready job, run next step,
 *     commit, repeat. Invoked by Railway's scheduler every 10-15 seconds.
 *   - Backoff lives in JobRun.nextAt; step retries bump nextAt forward.
 *   - Max concurrency is 1 per tick (single instance). This is fine at our
 *     scale — horizontal scale requires SKIP LOCKED which Prisma doesn't
 *     expose cleanly; revisit if we pass 100 jobs/min.
 */

import type { JobKind, Prisma } from "@prisma/client";

export type StepResult<TOutput = unknown> = {
  ok: boolean;
  output?: TOutput;
  error?: string;
  /** If set, override the default retry policy for this failure. */
  retryInSec?: number;
};

export type StepHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  ctx: StepContext,
) => Promise<StepResult<TOutput>>;

export type StepContext = {
  jobId: string;
  stepIndex: number;
  orgId: string;
  /** Outputs of previous steps keyed by step index. Handlers use this to
      chain: step N reads what step N-1 produced. */
  prior: Record<number, unknown>;
  tx: Prisma.TransactionClient;
};

export type StepSpec<TInput = unknown> = {
  /** Identifier resolved against the handler registry. */
  kind: string;
  input: TInput;
};

export type EnqueueInput = {
  orgId: string;
  kind: JobKind;
  input: Record<string, unknown>;
  steps: StepSpec[];
  correlationId?: string;
};

export const DEFAULT_MAX_ATTEMPTS = 5;
export const DEFAULT_RETRY_BASE_SEC = 15;  // exponential: 15, 30, 60, 120, 240
