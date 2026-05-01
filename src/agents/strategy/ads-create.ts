import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { toolComplete } from "../_base";

const InputSchema = z.object({
  brandDna: z.record(z.unknown()),
  funnelStage: z.enum(["TOF", "MOF", "BOF"]),
  platform: z.string(),
  offer: z.string().optional(),
});

type Output = {
  summary: string;
  concepts: { angle: string; headline: string; body: string; cta: string }[];
};

const OUTPUT_SCHEMA = {
  type: "object",
  required: ["summary", "concepts"],
  properties: {
    summary: { type: "string", maxLength: 120 },
    concepts: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        required: ["angle", "headline", "body", "cta"],
        properties: {
          angle: {
            type: "string",
            description: "One of: benefit, proof, story, contrast, urgency",
            maxLength: 30,
          },
          headline: { type: "string", maxLength: 40 },
          body: { type: "string", maxLength: 200 },
          cta: { type: "string", maxLength: 20 },
        },
      },
    },
  },
} as const;

const STUB: Output = {
  summary: "2 ad concepts drafted (Proof, Benefit angles)",
  concepts: [
    { angle: "Proof", headline: "7,000 reviews. One honest formula.", body: "…", cta: "Shop now" },
    { angle: "Benefit", headline: "Clinical results in 30 days.", body: "…", cta: "Try risk-free" },
  ],
};

export const adsCreate: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_CREATE,
  name: "Copy & Concept",
  description: "Generates angle-diverse ad concepts with headlines, body copy, and CTAs.",
  validate(input) {
    InputSchema.parse(input);
  },
  async run(_ctx, input) {
    return toolComplete<Output>({
      toolName: "submit_ad_concepts",
      toolDescription: "Submit the angle-diverse ad concept set.",
      schema: OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      stubData: STUB,
      system: `You are the Copy & Concept agent. Generate 5 ad concepts spanning
distinct angles (benefit, proof, story, contrast, urgency). Match tone-of-voice
rules and respect banned words. Headlines ≤ 40 chars, CTAs ≤ 20 chars.

Call submit_ad_concepts with the result. The summary field is a one-sentence
headline (≤120 chars) like "5 concepts spanning Benefit · Proof · Story · Contrast · Urgency".`,
      user: JSON.stringify(input),
    });
  },
};
