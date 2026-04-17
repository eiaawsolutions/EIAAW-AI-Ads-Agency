import { AgentKind, AgentRunStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AgentContext, AgentResult } from "./types";
import { getAgent } from "./registry";

/**
 * Dispatch an agent run. Persists start/end, usage, and output to AgentRun
 * so the full audit trail is queryable from the dashboard.
 */
export async function dispatch<TInput, TOutput>(
  kind: AgentKind,
  ctx: AgentContext,
  input: TInput,
): Promise<AgentResult<TOutput>> {
  const run = await db.agentRun.create({
    data: {
      orgId: ctx.orgId,
      campaignId: ctx.campaignId,
      kind,
      status: AgentRunStatus.RUNNING,
      input: input as object,
      startedAt: new Date(),
    },
  });

  try {
    const agent = getAgent(kind);
    agent.validate?.(input);
    const result = (await agent.run(ctx, input)) as AgentResult<TOutput>;

    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: result.ok ? AgentRunStatus.SUCCEEDED : AgentRunStatus.FAILED,
        output: (result.output ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull,
        error: result.error,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costUsd: result.costUsd,
        model: result.model,
        endedAt: new Date(),
      },
    });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.agentRun.update({
      where: { id: run.id },
      data: { status: AgentRunStatus.FAILED, error: message, endedAt: new Date() },
    });
    return { ok: false, error: message, tokensIn: 0, tokensOut: 0, costUsd: 0 };
  }
}

/**
 * Execute an end-to-end flow: dna → plan → competitor → create → ...
 * Each step receives the previous outputs via ctx + chained inputs.
 */
export async function runFlow(steps: { kind: AgentKind; input: unknown }[], ctx: AgentContext) {
  const outputs: Record<string, unknown> = {};
  for (const step of steps) {
    const res = await dispatch(step.kind, ctx, step.input);
    outputs[step.kind] = res;
    if (!res.ok && ctx.executionMode !== "AUTONOMOUS") break;
  }
  return outputs;
}
