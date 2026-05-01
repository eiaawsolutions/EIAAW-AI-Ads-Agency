import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { toolComplete } from "../_base";

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
  summary: string;
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

const OUTPUT_SCHEMA = {
  type: "object",
  required: [
    "summary",
    "businessGoals",
    "valueProps",
    "positioning",
    "personas",
    "markets",
    "toneOfVoice",
    "colorPalette",
    "typography",
    "imageryStyle",
  ],
  properties: {
    summary: { type: "string", maxLength: 120 },
    businessGoals: { type: "array", items: { type: "string" }, maxItems: 6 },
    valueProps: { type: "array", items: { type: "string" }, maxItems: 6 },
    positioning: { type: "string", maxLength: 240 },
    personas: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        required: ["name", "age", "channels"],
        properties: {
          name: { type: "string", maxLength: 60 },
          age: { type: "string", maxLength: 20 },
          channels: { type: "array", items: { type: "string" }, maxItems: 6 },
          pains: { type: "array", items: { type: "string" }, maxItems: 5 },
        },
      },
    },
    markets: { type: "array", items: { type: "string" }, maxItems: 8 },
    toneOfVoice: {
      type: "object",
      required: ["pillars", "banned"],
      properties: {
        pillars: { type: "array", items: { type: "string" }, maxItems: 6 },
        banned: { type: "array", items: { type: "string" }, maxItems: 8 },
      },
    },
    colorPalette: {
      type: "object",
      required: ["primary", "secondary", "accent"],
      properties: {
        primary: { type: "string", description: "Hex code, e.g. #14B39B" },
        secondary: { type: "string" },
        accent: { type: "string" },
      },
    },
    typography: {
      type: "object",
      required: ["display", "body"],
      properties: {
        display: { type: "string", maxLength: 60 },
        body: { type: "string", maxLength: 60 },
      },
    },
    imageryStyle: { type: "string", maxLength: 200 },
  },
} as const;

const STUB: Output = {
  summary: "1 persona · 2 markets · palette anchored on #14B39B",
  businessGoals: ["sales", "leads"],
  valueProps: ["Premium quality", "Fast delivery", "30-day guarantee"],
  positioning: "Category-defining solution for discerning customers.",
  personas: [{ name: "Growth Grace", age: "28-45", channels: ["IG", "Google Search"] }],
  markets: ["US", "CA"],
  toneOfVoice: { pillars: ["confident", "clear", "modern"], banned: ["cheap"] },
  colorPalette: { primary: "#14B39B", secondary: "#083C3C", accent: "#5DDECA" },
  typography: { display: "Inter", body: "Inter" },
  imageryStyle: "clean editorial with warm lighting",
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
    return toolComplete<Output>({
      toolName: "submit_brand_dna",
      toolDescription: "Submit the extracted brand DNA profile.",
      schema: OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      stubData: STUB,
      system: `You are the Brand DNA agent. Given a brand name and optional domain,
produce a rigorous brand profile covering business goals, audience personas,
tone of voice, visual identity (colors, typography, imagery), and positioning.
Be specific and avoid generic marketing platitudes.

Call submit_brand_dna with the result. The summary field is a one-sentence
headline (≤120 chars) like "3 personas · 2 markets · palette anchored on #14B39B".`,
      user: `Brand: ${parsed.brandName}${parsed.domain ? `\nDomain: ${parsed.domain}` : ""}${parsed.notes ? `\nNotes: ${parsed.notes}` : ""}`,
    });
  },
};
