import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { jsonComplete } from "../_base";

const InputSchema = z.object({
  brandDna: z.record(z.unknown()),
  funnelStage: z.enum(["TOF", "MOF", "BOF"]),
  platform: z.string(),
  offer: z.string().optional(),
});

type Output = {
  concepts: { angle: string; headline: string; body: string; cta: string }[];
};

export const adsCreate: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_CREATE,
  name: "Copy & Concept",
  description: "Generates angle-diverse ad concepts with headlines, body copy, and CTAs.",
  validate(input) {
    InputSchema.parse(input);
  },
  async run(_ctx, input) {
    return jsonComplete<Output>({
      schemaName: "AdCopy",
      system: `You are the Copy & Concept agent. Generate 5 ad concepts spanning
distinct angles (benefit, proof, story, contrast, urgency). Match tone-of-voice
rules and respect banned words. Headlines ≤ 40 chars, CTAs ≤ 20 chars.`,
      user: JSON.stringify(input),
    });
  },
};
