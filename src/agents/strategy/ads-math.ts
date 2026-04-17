import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";

const InputSchema = z.object({
  monthlyBudgetUsd: z.number().positive(),
  cpcUsd: z.number().positive().default(1.2),
  conversionRate: z.number().min(0).max(1).default(0.03),
  averageOrderValueUsd: z.number().positive().default(65),
  industryBenchmarkCtr: z.number().min(0).max(1).default(0.015),
});

type Scenario = { label: string; spend: number; revenue: number; roas: number; cpa: number };
type Output = { scenarios: Scenario[]; assumptions: Record<string, number> };

/**
 * Pure deterministic forecaster — no LLM call. Produces Conservative /
 * Moderate / Aggressive scenarios based on bounded-rationality multipliers
 * applied to user inputs + category benchmarks.
 */
export const adsMath: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_MATH,
  name: "Cost Prediction",
  description: "Forecasts CPC, CPA, ROAS across conservative/moderate/aggressive scenarios.",
  validate(input) {
    InputSchema.parse(input);
  },
  async run(_ctx, input) {
    const parsed = InputSchema.parse(input);
    const base = forecast(parsed, 1.0);
    const conservative = forecast(parsed, 0.75);
    const aggressive = forecast(parsed, 1.35);
    return {
      ok: true,
      output: {
        scenarios: [
          { label: "Conservative", ...conservative },
          { label: "Moderate", ...base },
          { label: "Aggressive", ...aggressive },
        ],
        assumptions: parsed as unknown as Record<string, number>,
      },
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
    };
  },
};

function forecast(
  i: z.infer<typeof InputSchema>,
  multiplier: number,
): { spend: number; revenue: number; roas: number; cpa: number } {
  const spend = i.monthlyBudgetUsd;
  const clicks = (spend / i.cpcUsd) * multiplier;
  const conversions = clicks * i.conversionRate;
  const revenue = conversions * i.averageOrderValueUsd;
  return {
    spend: Math.round(spend),
    revenue: Math.round(revenue),
    roas: Number((revenue / Math.max(spend, 1)).toFixed(2)),
    cpa: Number((spend / Math.max(conversions, 1)).toFixed(2)),
  };
}
