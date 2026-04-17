import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { jsonComplete } from "../_base";

const InputSchema = z.object({
  brand: z.string(),
  competitors: z.array(z.string()).optional(),
  market: z.string().default("US"),
});

type Output = {
  competitors: { name: string; spendEstimate: string; topFormats: string[] }[];
  trends: string[];
  gaps: string[];
};

export const adsCompetitor: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_COMPETITOR,
  name: "Competitor Intel",
  description: "Surfaces competitor ad spend, creative trends, and whitespace opportunities.",
  async run(_ctx, input) {
    return jsonComplete<Output>({
      schemaName: "Competitor",
      system: `You are the Competitor Intelligence agent. List top 5 competitors with
estimated monthly ad spend, dominant formats, and whitespace where the user's
brand can differentiate. Cite Meta Ad Library / Google Transparency patterns.`,
      user: JSON.stringify(input),
    });
  },
};
