import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { jsonComplete } from "../_base";

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
  hypothesis: string;
  variants: { key: string; trafficPct: number; description: string }[];
  minSampleSize: number;
  expectedDurationDays: number;
  primaryMetric: string;
  guardrails: string[];
};

/**
 * A/B test designer. Uses frequentist sample-size formula:
 *   n = 16 * p(1-p) / (p*MDE)^2  (two-tailed, alpha=0.05, power=0.8)
 * so results are deterministic. LLM fills in variant descriptions.
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

    const llm = await jsonComplete<{ variants: { key: string; trafficPct: number; description: string }[]; guardrails: string[] }>({
      schemaName: "Experiment",
      system: `You design rigorous ad experiments. Given hypothesis and kind, generate
2-4 variant descriptions and 3-5 guardrail metrics (e.g. frequency cap, CPA ceiling).`,
      user: JSON.stringify({ hypothesis: parsed.hypothesis, kind: parsed.kind }),
    });

    return {
      ok: true,
      output: {
        hypothesis: parsed.hypothesis,
        variants: llm.output?.variants ?? [
          { key: "A", trafficPct: 50, description: "Control" },
          { key: "B", trafficPct: 50, description: "Treatment" },
        ],
        minSampleSize: nPerVariant * 2,
        expectedDurationDays: days,
        primaryMetric: "roas",
        guardrails: llm.output?.guardrails ?? ["frequency ≤ 2.5", "CPA ≤ target × 1.3"],
      },
      tokensIn: llm.tokensIn,
      tokensOut: llm.tokensOut,
      costUsd: llm.costUsd,
      model: llm.model,
      stubbed: llm.stubbed,
    };
  },
};
