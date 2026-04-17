import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";

const InputSchema = z.object({
  concept: z.string(),
  platform: z.string(),
  aspectRatio: z.enum(["1:1", "9:16", "4:5", "16:9"]).default("1:1"),
  brandPalette: z.object({ primary: z.string() }).optional(),
});

type Output = {
  images: { url: string; prompt: string; aspectRatio: string }[];
  note: string;
};

/**
 * Image generation is delegated to an external provider (FAL.AI, direct
 * Gemini/nano-banana, or self-hosted SDXL) based on env config. This stub
 * returns deterministic placeholders so the UI renders correctly.
 */
export const adsGenerate: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_GENERATE,
  name: "Creative Generator",
  description: "Generates platform-sized ad images from concept + brand palette.",
  validate(input) {
    InputSchema.parse(input);
  },
  async run(_ctx, input) {
    // TODO: wire FAL.AI / nanobanana via AI_MEDIA_PROVIDER env.
    const parsed = InputSchema.parse(input);
    const dims: Record<string, string> = { "1:1": "1080x1080", "9:16": "1080x1920", "4:5": "1080x1350", "16:9": "1920x1080" };
    return {
      ok: true,
      output: {
        images: Array.from({ length: 4 }).map((_, i) => ({
          url: `https://placehold.co/${dims[parsed.aspectRatio]}/14B39B/FFFFFF?text=${encodeURIComponent(`Ad ${i + 1}`)}`,
          prompt: parsed.concept,
          aspectRatio: parsed.aspectRatio,
        })),
        note: "Placeholder images. Connect a provider (FAL.AI / nanobanana) to generate real creatives.",
      },
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      stubbed: true,
    };
  },
};
