import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { toolComplete } from "../_base";

const InputSchema = z.object({
  brand: z.string(),
  competitors: z.array(z.string()).optional(),
  market: z.string().default("US"),
});

type Output = {
  summary: string;
  competitors: { name: string; spendEstimate: string; topFormats: string[] }[];
  trends: string[];
  gaps: string[];
};

const OUTPUT_SCHEMA = {
  type: "object",
  required: ["summary", "competitors", "trends", "gaps"],
  properties: {
    summary: { type: "string", maxLength: 120 },
    competitors: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        required: ["name", "spendEstimate", "topFormats"],
        properties: {
          name: { type: "string", maxLength: 80 },
          spendEstimate: { type: "string", maxLength: 40, description: 'e.g. "$120k/mo"' },
          topFormats: {
            type: "array",
            items: { type: "string", maxLength: 30 },
            minItems: 1,
            maxItems: 5,
          },
        },
      },
    },
    trends: { type: "array", items: { type: "string", maxLength: 140 }, maxItems: 6 },
    gaps: { type: "array", items: { type: "string", maxLength: 140 }, maxItems: 6 },
  },
} as const;

const STUB: Output = {
  summary: "2 competitors mapped · 2 trends · 1 whitespace gap",
  competitors: [
    { name: "Alpha Co", spendEstimate: "$120k/mo", topFormats: ["Reels", "Search"] },
    { name: "Beta Ltd", spendEstimate: "$80k/mo", topFormats: ["Display", "YouTube"] },
  ],
  trends: ["UGC with creator voiceover", "Before/after static"],
  gaps: ["Owned content on Performance Max missing"],
};

export const adsCompetitor: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_COMPETITOR,
  name: "Competitor Intel",
  description: "Surfaces competitor ad spend, creative trends, and whitespace opportunities.",
  async run(_ctx, input) {
    return toolComplete<Output>({
      toolName: "submit_competitor_intel",
      toolDescription: "Submit the competitor intelligence report.",
      schema: OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      stubData: STUB,
      system: `You are the Competitor Intelligence agent. List top 5 competitors with
estimated monthly ad spend, dominant formats, and whitespace where the user's
brand can differentiate. Cite Meta Ad Library / Google Transparency patterns.

Call submit_competitor_intel with the result. The summary is a one-sentence
headline (≤120 chars) like "5 competitors mapped · 3 trends · 2 whitespace gaps".`,
      user: JSON.stringify(input),
    });
  },
};
