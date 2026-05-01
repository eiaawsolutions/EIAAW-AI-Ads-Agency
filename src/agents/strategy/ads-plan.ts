import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { toolComplete } from "../_base";

const InputSchema = z.object({
  objective: z.enum(["SALES", "LEADS", "APP_INSTALLS", "TRAFFIC", "AWARENESS", "ENGAGEMENT"]),
  monthlyBudgetUsd: z.number().positive(),
  platforms: z.array(z.string()).min(1),
  targetCpa: z.number().optional(),
  targetRoas: z.number().optional(),
  targetLocation: z.string().min(1).max(120).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  brandDna: z.record(z.unknown()).optional(),
});

type Output = {
  summary: string;
  funnel: { tof: number; mof: number; bof: number };
  allocation: Record<string, number>;
  kpis: { targetCpa?: number; targetRoas?: number; targetCtr?: number };
  rationale: string;
  milestones?: { week: number; action: string }[];
};

// JSON Schema for the tool_use call. Anthropic enforces this server-side
// so we never see truncation or unescaped-quote parse errors.
const OUTPUT_SCHEMA = {
  type: "object",
  required: ["summary", "funnel", "allocation", "kpis", "rationale"],
  properties: {
    summary: {
      type: "string",
      maxLength: 120,
      description: "One-sentence headline for the activity feed.",
    },
    funnel: {
      type: "object",
      required: ["tof", "mof", "bof"],
      properties: {
        tof: { type: "number", minimum: 0, maximum: 1 },
        mof: { type: "number", minimum: 0, maximum: 1 },
        bof: { type: "number", minimum: 0, maximum: 1 },
      },
    },
    allocation: {
      type: "object",
      description: "Platform → share. Values sum to 1.0.",
      additionalProperties: { type: "number", minimum: 0, maximum: 1 },
    },
    kpis: {
      type: "object",
      properties: {
        targetCpa: { type: "number" },
        targetRoas: { type: "number" },
        targetCtr: { type: "number" },
      },
    },
    rationale: {
      type: "string",
      maxLength: 600,
      description: "≤3 sentences explaining the strategy.",
    },
    milestones: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        required: ["week", "action"],
        properties: {
          week: { type: "integer", minimum: 1, maximum: 12 },
          action: { type: "string", maxLength: 140 },
        },
      },
    },
  },
} as const;

const STUB: Output = {
  summary: "META 40% · GOOGLE 40% · TIKTOK 20% · target CPA $25",
  funnel: { tof: 0.5, mof: 0.3, bof: 0.2 },
  allocation: { META: 0.4, GOOGLE: 0.4, TIKTOK: 0.2 },
  kpis: { targetCpa: 25, targetRoas: 3.0, targetCtr: 1.5 },
  rationale: "Balanced TOF/BOF split with Meta + Google anchoring performance.",
};

export const adsPlan: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_PLAN,
  name: "Strategy Builder",
  description: "Produces platform mix, funnel weights, KPI targets, and a 12-week plan.",
  validate(input) {
    InputSchema.parse(input);
  },
  async run(_ctx, input) {
    return toolComplete<Output>({
      toolName: "submit_ads_plan",
      toolDescription:
        "Submit the finalized media plan. The platform allocation must sum to 1.0; rationale must be at most 3 sentences.",
      schema: OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      stubData: STUB,
      maxTokens: 4096,
      system: `You are the Strategy Builder agent. Produce a quantitative media plan:
funnel weights (TOF/MOF/BOF), platform allocation summing to 1.0, KPI targets
grounded in category benchmarks, and a weekly rollout (max 12 entries). Be
conservative on week-1 spend and escalate only after learning thresholds are met.

Honor the input target geography when shaping platform allocation, CPM/CPC
benchmarks, and KPI targets — auction prices in MY/SG/AE differ materially
from US/UK/EU. Express all monetary KPIs (targetCpa, etc.) in the input
currency, not USD, when a currency is provided. Mention the geography and
currency once in the rationale so the operator sees they were considered.

Call the submit_ads_plan tool with the result. Always populate the summary
field with a one-sentence headline (≤120 chars).`,
      user: JSON.stringify(input),
    });
  },
};
