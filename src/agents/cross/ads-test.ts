import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { toolComplete } from "../_base";

const InputSchema = z.object({
  hypothesis: z.string(),
  kind: z.enum(["headline", "creative", "audience", "cta", "multivariate"]),
  baselineMetrics: z.object({
    dailyConversions: z.number().positive(),
    conversionRate: z.number().min(0).max(1),
  }),
  mde: z.number().default(0.1),
});

type Output = {
  summary: string;
  hypothesis: string;
  variants: { key: string; trafficPct: number; description: string }[];
  minSampleSize: number;
  expectedDurationDays: number;
  primaryMetric: string;
  guardrails: string[];
};

type LlmPart = {
  variants: { key: string; trafficPct: number; description: string }[];
  guardrails: string[];
};

const VARIANT_SCHEMA = {
  type: "object",
  required: ["variants", "guardrails"],
  properties: {
    variants: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        required: ["key", "trafficPct", "description"],
        properties: {
          key: { type: "string", maxLength: 4 },
          trafficPct: { type: "number", minimum: 0, maximum: 100 },
          description: { type: "string", maxLength: 200 },
        },
      },
    },
    guardrails: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string", maxLength: 140 },
    },
  },
} as const;

const VARIANT_STUB: LlmPart = {
  variants: [
    { key: "A", trafficPct: 50, description: "Control" },
    { key: "B", trafficPct: 50, description: "Treatment" },
  ],
  guardrails: ["frequency ≤ 2.5", "CPA ≤ target × 1.3", "no spend cap breach"],
};

/**
 * A/B test designer. Uses frequentist sample-size formula:
 *   n = 16 * p(1-p) / (p*MDE)^2  (two-tailed, alpha=0.05, power=0.8)
 * so results are deterministic. LLM fills in variant descriptions via
 * tool_use so we never see a JSON parse error mid-experiment.
 */
export const adsTest: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_TEST,
  name: "A/B Testing Engine",
  description: "Designs experiments, computes sample size, and manages traffic splits.",
  validate(input) {
    InputSchema.parse(input);
  },
  async run(_ctx, input) {
    const parsed = InputSchema.parse(input);
    const p = parsed.baselineMetrics.conversionRate;
    const mde = parsed.mde;
    const nPerVariant = Math.ceil((16 * p * (1 - p)) / Math.pow(p * mde, 2));
    const days = Math.max(7, Math.ceil((2 * nPerVariant) / parsed.baselineMetrics.dailyConversions));

    const llm = await toolComplete<LlmPart>({
      toolName: "submit_experiment_design",
      toolDescription: "Submit variant descriptions and guardrail metrics for the A/B test.",
      schema: VARIANT_SCHEMA as unknown as Record<string, unknown>,
      stubData: VARIANT_STUB,
      system: `You design rigorous ad experiments. Given hypothesis and kind, generate
2-4 variant descriptions (trafficPct values must sum to 100) and 3-5 guardrail
metrics (e.g. frequency cap, CPA ceiling).

Call submit_experiment_design with the result.`,
      user: JSON.stringify({ hypothesis: parsed.hypothesis, kind: parsed.kind }),
    });

    const variants = llm.output?.variants ?? VARIANT_STUB.variants;
    const guardrails = llm.output?.guardrails ?? VARIANT_STUB.guardrails;

    return {
      ok: llm.ok,
      output: {
        summary: `${variants.length} variants · n=${nPerVariant * 2} · ~${days}d to readout`,
        hypothesis: parsed.hypothesis,
        variants,
        minSampleSize: nPerVariant * 2,
        expectedDurationDays: days,
        primaryMetric: "roas",
        guardrails,
      },
      error: llm.ok ? undefined : llm.error,
      tokensIn: llm.tokensIn,
      tokensOut: llm.tokensOut,
      costUsd: llm.costUsd,
      model: llm.model,
      stubbed: llm.stubbed,
    };
  },
};
