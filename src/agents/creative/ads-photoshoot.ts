import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";

const InputSchema = z.object({
  productImageUrl: z.string().url(),
  styles: z.array(z.enum(["studio", "floating", "ingredient", "in_use", "lifestyle"])).default(["studio", "floating", "ingredient", "in_use", "lifestyle"]),
});

type Output = {
  variants: { style: string; url: string }[];
  note: string;
};

export const adsPhotoshoot: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_PHOTOSHOOT,
  name: "Product Photoshoot",
  description: "Transforms a single product image into 5 professional ad variants.",
  validate(input) {
    InputSchema.parse(input);
  },
  async run(_ctx, input) {
    const parsed = InputSchema.parse(input);
    return {
      ok: true,
      output: {
        variants: parsed.styles.map((style) => ({
          style,
          url: `https://placehold.co/1080x1080/14B39B/FFFFFF?text=${encodeURIComponent(style)}`,
        })),
        note: "Connect banana-claude / nanobanana-mcp to produce real photoshoot variants.",
      },
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      stubbed: true,
    };
  },
};
