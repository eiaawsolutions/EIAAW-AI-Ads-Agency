import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { jsonComplete } from "../_base";

const InputSchema = z.object({
  brandName: z.string().min(1),
  domain: z.string().url().optional(),
  notes: z.string().optional(),
});

type Output = {
  businessGoals: string[];
  valueProps: string[];
  positioning: string;
  personas: { name: string; age: string; channels: string[]; pains?: string[] }[];
  markets: string[];
  toneOfVoice: { pillars: string[]; banned: string[] };
  colorPalette: { primary: string; secondary: string; accent: string };
  typography: { display: string; body: string };
  imageryStyle: string;
};

export const adsDna: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_DNA,
  name: "Brand DNA",
  description: "Extracts brand visual identity, tone, audience, and positioning from a URL.",
  validate(input) {
    InputSchema.parse(input);
  },
  async run(_ctx, input) {
    return jsonComplete<Output>({
      schemaName: "BrandDna",
      system: `You are the Brand DNA agent. Given a brand name and optional domain,
produce a rigorous brand profile covering business goals, audience personas,
tone of voice, visual identity (colors, typography, imagery), and positioning.
Be specific and avoid generic marketing platitudes.`,
      user: `Brand: ${input.brandName}${input.domain ? `\nDomain: ${input.domain}` : ""}${input.notes ? `\nNotes: ${input.notes}` : ""}`,
    });
  },
};
