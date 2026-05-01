import { MODELS, structuredComplete } from "@/lib/anthropic";
import type { AgentResult } from "./types";

// Pricing per 1M tokens — update when Anthropic changes pricing.
const PRICING: Record<string, { inUsd: number; outUsd: number }> = {
  "claude-opus-4-7": { inUsd: 15, outUsd: 75 },
  "claude-sonnet-4-6": { inUsd: 3, outUsd: 15 },
  "claude-haiku-4-5-20251001": { inUsd: 0.8, outUsd: 4 },
};

export function costOf(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model] ?? PRICING[MODELS.primary];
  return (tokensIn * p.inUsd + tokensOut * p.outUsd) / 1_000_000;
}

/**
 * Prompt registry — every system prompt has a version string. The version
 * lands in AgentRun.output._meta so we can reconstruct exact behavior for
 * any past run, and diff quality between prompt revisions.
 */
export const PROMPT_VERSION = "2026.04.18-1";

/**
 * Run an agent with structured output via Anthropic tool_use. The model is
 * forced to call a tool whose `input_schema` matches the agent's Output
 * type — eliminates the JSON parse-error class (truncation, unescaped
 * quotes, code fences) at the model boundary.
 *
 * The system prompt is marked for ephemeral cache — repeat calls with the
 * same system prompt within 5 minutes pay 10% of the input-token price.
 */
export async function toolComplete<T>(opts: {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
  stubData: T;
  model?: string;
  maxTokens?: number;
}): Promise<AgentResult<T>> {
  const res = await structuredComplete<T>({
    system: opts.system,
    user: opts.user,
    toolName: opts.toolName,
    toolDescription: opts.toolDescription,
    schema: opts.schema,
    stubData: opts.stubData,
    model: opts.model,
    maxTokens: opts.maxTokens ?? 4096,
    cacheSystem: true,
  });

  if (res.stubbed && res.data) {
    return {
      ok: true,
      output: withMeta(res.data, {
        schema: opts.toolName,
        promptVersion: PROMPT_VERSION,
        model: res.model,
        stubbed: true,
      }),
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      model: res.model,
      stubbed: true,
    };
  }

  if (!res.data) {
    const error = res.toolError
      ?? (res.stopReason === "max_tokens"
        ? "The agent's response was too long and got cut off. Try simplifying inputs or contact support if this keeps happening."
        : "The agent did not return a structured response. Try again — the model may be having a bad moment.");
    return {
      ok: false,
      error,
      tokensIn: res.tokensIn,
      tokensOut: res.tokensOut,
      costUsd: costOf(res.model, res.tokensIn, res.tokensOut),
      model: res.model,
    };
  }

  return {
    ok: true,
    output: withMeta(res.data, {
      schema: opts.toolName,
      promptVersion: PROMPT_VERSION,
      model: res.model,
      stubbed: false,
    }),
    tokensIn: res.tokensIn,
    tokensOut: res.tokensOut,
    costUsd: costOf(res.model, res.tokensIn, res.tokensOut),
    model: res.model,
  };
}

/**
 * Attach _meta to the agent output for reproducibility. Non-enumerable
 * so it doesn't leak into UI rendering loops that just iterate keys.
 */
function withMeta<T>(payload: T, meta: { schema: string; promptVersion: string; model: string; stubbed: boolean }): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    Object.defineProperty(payload, "_meta", { value: meta, enumerable: false, writable: false });
  }
  return payload;
}
