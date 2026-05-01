import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { toolComplete } from "../_base";

const InputSchema = z.object({
  ads: z.array(
    z.object({
      id: z.string(),
      headline: z.string().optional(),
      body: z.string().optional(),
      imageUrl: z.string().optional(),
      metrics: z.record(z.number()).optional(),
    }),
  ),
});

type Output = {
  summary: string;
  fatigueFlags: { adId: string; frequency: number; recommendation: string }[];
  diversityScore: number;
  formatGaps: string[];
};

const OUTPUT_SCHEMA = {
  type: "object",
  required: ["summary", "fatigueFlags", "diversityScore", "formatGaps"],
  properties: {
    summary: { type: "string", maxLength: 120 },
    fatigueFlags: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        required: ["adId", "frequency", "recommendation"],
        properties: {
          adId: { type: "string", maxLength: 80 },
          frequency: { type: "number", minimum: 0 },
          recommendation: { type: "string", maxLength: 200 },
        },
      },
    },
    diversityScore: { type: "number", minimum: 0, maximum: 100 },
    formatGaps: { type: "array", items: { type: "string", maxLength: 140 }, maxItems: 8 },
  },
} as const;

const STUB: Output = {
  summary: "Diversity 65/100 · 1 fatigue flag · 2 format gaps",
  fatigueFlags: [
    { adId: "stub-001", frequency: 2.4, recommendation: "Rotate creative — frequency past 2.0 with declining CTR." },
  ],
  diversityScore: 65,
  formatGaps: ["No vertical video for Reels/Shorts", "Static-only — missing UGC video"],
};

export const adsCreative: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_CREATIVE,
  name: "Creative Quality",
  description: "Audits ad creative for fatigue, diversity, format coverage, and compliance.",
  async run(_ctx, input) {
    return toolComplete<Output>({
      toolName: "submit_creative_audit",
      toolDescription: "Submit the creative quality audit.",
      schema: OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      stubData: STUB,
      system: `You are the Creative Quality agent. Flag fatigue (freq ≥ 2.0 + declining CTR),
score format diversity (static/video/UGC), and identify missing platform-native formats.

Call submit_creative_audit with the result. The summary is a one-sentence
headline (≤120 chars) like "Diversity 65/100 · 3 fatigue flags · 2 format gaps".`,
      user: JSON.stringify(input),
    });
  },
};
