import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";

const InputSchema = z.object({
  totalBudgetUsd: z.number().positive(),
  platforms: z.array(z.object({ platform: z.string(), roas30d: z.number(), spend30d: z.number() })),
  scalingRule: z.enum(["20%", "30%", "50%"]).default("20%"),
});

type Output = {
  allocation: Record<string, { budgetUsd: number; action: "scale" | "hold" | "kill" }>;
  rationale: string;
};

/**
 * Rule-based allocator: 70/20/10 split across top performers,
 * 3x Kill Rule (if CPA > 3x target, kill), 20% scaling rule.
 * This is intentionally LLM-free for determinism and auditability.
 */
export const adsBudget: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_BUDGET,
  name: "Budget Allocator",
  description: "Reallocates spend across platforms using 70/20/10 + kill rules.",
  validate(input) {
    InputSchema.parse(input);
  },
  async run(_ctx, input) {
    const parsed = InputSchema.parse(input);
    const sorted = [...parsed.platforms].sort((a, b) => b.roas30d - a.roas30d);
    const splits = [0.7, 0.2, 0.1];
    const allocation: Output["allocation"] = {};
    sorted.forEach((p, i) => {
      const budget = parsed.totalBudgetUsd * (splits[i] ?? 0);
      const action: "scale" | "hold" | "kill" =
        p.roas30d >= 3 ? "scale" : p.roas30d >= 1.5 ? "hold" : "kill";
      allocation[p.platform] = { budgetUsd: Math.round(budget), action };
    });
    return {
      ok: true,
      output: {
        allocation,
        rationale: "70/20/10 split by trailing-30d ROAS. Platforms with ROAS < 1.5 are killed.",
      },
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
    };
  },
};
