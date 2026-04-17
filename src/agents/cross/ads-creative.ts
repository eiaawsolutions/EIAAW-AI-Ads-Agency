import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { jsonComplete } from "../_base";

const InputSchema = z.object({
  ads: z.array(z.object({ id: z.string(), headline: z.string().optional(), body: z.string().optional(), imageUrl: z.string().optional(), metrics: z.record(z.number()).optional() })),
});

type Output = {
  fatigueFlags: { adId: string; frequency: number; recommendation: string }[];
  diversityScore: number;
  formatGaps: string[];
};

export const adsCreative: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_CREATIVE,
  name: "Creative Quality",
  description: "Audits ad creative for fatigue, diversity, format coverage, and compliance.",
  async run(_ctx, input) {
    return jsonComplete<Output>({
      schemaName: "CreativeAudit",
      system: `You are the Creative Quality agent. Flag fatigue (freq ≥ 2.0 + declining CTR),
score format diversity (static/video/UGC), and identify missing platform-native formats.`,
      user: JSON.stringify(input),
    });
  },
};
