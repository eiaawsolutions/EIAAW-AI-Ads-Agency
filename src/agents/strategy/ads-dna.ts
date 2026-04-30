import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { jsonComplete } from "../_base";

// Accepts bare hostnames ("eiaawsolutions.com") and full URLs ("https://...").
// Empty/whitespace input is treated as "no domain provided".
const DomainSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  })
  .refine(
    (v) => {
      if (v === undefined) return true;
      try {
        const u = new URL(v);
        return Boolean(u.hostname) && u.hostname.includes(".");
      } catch {
        return false;
      }
    },
    { message: "must be a valid website (e.g. example.com or https://example.com)" },
  );

const InputSchema = z.object({
  brandName: z.string().trim().min(1, "brand name is required"),
  domain: DomainSchema,
  notes: z.string().trim().optional(),
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
    const parsed = InputSchema.parse(input);
    return jsonComplete<Output>({
      schemaName: "BrandDna",
      system: `You are the Brand DNA agent. Given a brand name and optional domain,
produce a rigorous brand profile covering business goals, audience personas,
tone of voice, visual identity (colors, typography, imagery), and positioning.
Be specific and avoid generic marketing platitudes.`,
      user: `Brand: ${parsed.brandName}${parsed.domain ? `\nDomain: ${parsed.domain}` : ""}${parsed.notes ? `\nNotes: ${parsed.notes}` : ""}`,
    });
  },
};
