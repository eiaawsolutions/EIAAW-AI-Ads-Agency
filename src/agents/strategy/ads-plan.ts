import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { jsonComplete } from "../_base";

const InputSchema = z.object({
  objective: z.enum(["SALES", "LEADS", "APP_INSTALLS", "TRAFFIC", "AWARENESS", "ENGAGEMENT"]),
  monthlyBudgetUsd: z.number().positive(),
  platforms: z.array(z.string()).min(1),
  targetCpa: z.number().optional(),
  targetRoas: z.number().optional(),
  brandDna: z.record(z.unknown()).optional(),
});

type Output = {
  funnel: { tof: number; mof: number; bof: number };
  allocation: Record<string, number>;
  kpis: { targetCpa?: number; targetRoas?: number; targetCtr?: number };
  rationale: string;
  milestones?: { week: number; action: string }[];
};

export const adsPlan: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_PLAN,
  name: "Strategy Builder",
  description: "Produces platform mix, funnel weights, KPI targets, and a 12-week plan.",
  validate(input) {
    InputSchema.parse(input);
  },
  async run(_ctx, input) {
    return jsonComplete<Output>({
      schemaName: "AdsPlan",
      system: `You are the Strategy Builder agent. Produce a quantitative media plan:
funnel weights (TOF/MOF/BOF), platform allocation summing to 1.0, KPI targets
grounded in category benchmarks, and a weekly rollout. Be conservative on week-1
spend and escalate only after learning thresholds are met.`,
      user: JSON.stringify(input),
    });
  },
};
