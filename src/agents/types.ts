import type { AgentKind } from "@prisma/client";

export type AgentContext = {
  orgId: string;
  brandId?: string;
  campaignId?: string;
  userId?: string;
  executionMode: "AUTONOMOUS" | "ASSISTED" | "ENTERPRISE";
};

export type AgentResult<TOutput = unknown> = {
  ok: boolean;
  output?: TOutput;
  error?: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  model?: string;
  stubbed?: boolean;
};

export interface Agent<TInput = unknown, TOutput = unknown> {
  kind: AgentKind;
  name: string;
  description: string;
  /** Validate input at runtime; throw to reject. */
  validate?(input: TInput): void;
  /** Execute the agent. Must never throw on expected failure — return ok:false. */
  run(ctx: AgentContext, input: TInput): Promise<AgentResult<TOutput>>;
}

export const AGENT_CATEGORY: Record<AgentKind, "strategy" | "platform" | "cross" | "creative"> = {
  ADS_PLAN: "strategy",
  ADS_DNA: "strategy",
  ADS_CREATE: "strategy",
  ADS_MATH: "strategy",
  ADS_BUDGET: "strategy",
  ADS_GOOGLE: "platform",
  ADS_META: "platform",
  ADS_TIKTOK: "platform",
  ADS_LINKEDIN: "platform",
  ADS_MICROSOFT: "platform",
  ADS_YOUTUBE: "platform",
  ADS_APPLE: "platform",
  ADS_AUDIT: "cross",
  ADS_CREATIVE: "cross",
  ADS_COMPETITOR: "cross",
  ADS_LANDING: "cross",
  ADS_TEST: "cross",
  ADS_GENERATE: "creative",
  ADS_PHOTOSHOOT: "creative",
};
