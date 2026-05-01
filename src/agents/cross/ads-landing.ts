import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { toolComplete } from "../_base";

const InputSchema = z.object({
  url: z.string().url(),
  adPromise: z.string().optional(),
});

type Output = {
  summary: string;
  messageMatchScore: number;
  mobileScore: number;
  trustSignals: string[];
  issues: { severity: "P0" | "P1" | "P2"; note: string }[];
  cro: { test: string; expectedLift: string }[];
};

const OUTPUT_SCHEMA = {
  type: "object",
  required: ["summary", "messageMatchScore", "mobileScore", "trustSignals", "issues", "cro"],
  properties: {
    summary: { type: "string", maxLength: 120 },
    messageMatchScore: { type: "number", minimum: 0, maximum: 100 },
    mobileScore: { type: "number", minimum: 0, maximum: 100 },
    trustSignals: { type: "array", items: { type: "string", maxLength: 140 }, maxItems: 10 },
    issues: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        required: ["severity", "note"],
        properties: {
          severity: { type: "string", enum: ["P0", "P1", "P2"] },
          note: { type: "string", maxLength: 240 },
        },
      },
    },
    cro: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        required: ["test", "expectedLift"],
        properties: {
          test: { type: "string", maxLength: 200 },
          expectedLift: { type: "string", maxLength: 60 },
        },
      },
    },
  },
} as const;

const STUB: Output = {
  summary: "Message match 70/100 · mobile 80/100 · 3 CRO tests proposed",
  messageMatchScore: 70,
  mobileScore: 80,
  trustSignals: ["Customer reviews above the fold", "Trust badges in checkout"],
  issues: [{ severity: "P1", note: "Hero copy doesn't mirror ad headline." }],
  cro: [{ test: "Add headline matching ad promise", expectedLift: "+8-12%" }],
};

export const adsLanding: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_LANDING,
  name: "Landing Optimizer",
  description: "Scores landing page post-click experience and suggests CRO tests.",
  async run(_ctx, input) {
    return toolComplete<Output>({
      toolName: "submit_landing_audit",
      toolDescription: "Submit the landing page audit + CRO recommendations.",
      schema: OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      stubData: STUB,
      system: `You are the Landing Optimizer agent. Score message match, mobile UX,
trust signal density. List 3 prioritized CRO experiments with expected lift.

Call submit_landing_audit with the result. The summary is a one-sentence
headline (≤120 chars) like "Message match 75/100 · mobile 60/100 · 3 CRO tests proposed".`,
      user: JSON.stringify(input),
    });
  },
};
