import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { jsonComplete } from "../_base";

const InputSchema = z.object({
  platform: z.string(),
  metricsSummary: z.record(z.unknown()),
  benchmarks: z.record(z.unknown()).optional(),
});

type Output = {
  score: number;
  findings: { severity: "P0" | "P1" | "P2" | "P3"; area: string; note: string }[];
};

export const adsAudit: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_AUDIT,
  name: "Performance Audit",
  description: "Diagnoses account health against 250+ checks across tracking, structure, creative, bids.",
  validate(input) {
    InputSchema.parse(input);
  },
  async run(_ctx, input) {
    return jsonComplete<Output>({
      schemaName: "AuditReport",
      system: `You are the Performance Audit agent. Score 0-100, emit P0-P3 findings
across tracking, creative fatigue, account structure, bid strategy, audience
overlap, wasted spend. Each finding must be actionable.`,
      user: JSON.stringify(input),
    });
  },
};
