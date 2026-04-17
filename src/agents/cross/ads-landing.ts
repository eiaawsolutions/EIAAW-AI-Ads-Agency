import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { jsonComplete } from "../_base";

const InputSchema = z.object({
  url: z.string().url(),
  adPromise: z.string().optional(),
});

type Output = {
  messageMatchScore: number;
  mobileScore: number;
  trustSignals: string[];
  issues: { severity: "P0" | "P1" | "P2"; note: string }[];
  cro: { test: string; expectedLift: string }[];
};

export const adsLanding: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_LANDING,
  name: "Landing Optimizer",
  description: "Scores landing page post-click experience and suggests CRO tests.",
  async run(_ctx, input) {
    return jsonComplete<Output>({
      schemaName: "LandingAudit",
      system: `You are the Landing Optimizer agent. Score message match, mobile UX,
trust signal density. List 3 prioritized CRO experiments with expected lift.`,
      user: JSON.stringify(input),
    });
  },
};
