import { AgentKind } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { toolComplete } from "../_base";

const InputSchema = z.object({
  platform: z.string(),
  metricsSummary: z.record(z.unknown()),
  benchmarks: z.record(z.unknown()).optional(),
});

type Output = {
  summary: string;
  score: number;
  findings: { severity: "P0" | "P1" | "P2" | "P3"; area: string; note: string }[];
};

const OUTPUT_SCHEMA = {
  type: "object",
  required: ["summary", "score", "findings"],
  properties: {
    summary: { type: "string", maxLength: 120 },
    score: { type: "number", minimum: 0, maximum: 100 },
    findings: {
      type: "array",
      maxItems: 25,
      items: {
        type: "object",
        required: ["severity", "area", "note"],
        properties: {
          severity: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
          area: {
            type: "string",
            description:
              "One of: tracking, structure, creative, bids, audiences, wasted-spend",
            maxLength: 30,
          },
          note: { type: "string", maxLength: 280 },
        },
      },
    },
  },
} as const;

const STUB: Output = {
  summary: "Score 78/100 · 2 findings (1 P0 tracking, 1 P1 creative)",
  score: 78,
  findings: [
    { severity: "P0", area: "tracking", note: "CAPI not deduplicating Pixel events." },
    { severity: "P1", area: "creative", note: "Fatigue at 2.4 frequency on 3 top ads." },
  ],
};

export const adsAudit: Agent<z.infer<typeof InputSchema>, Output> = {
  kind: AgentKind.ADS_AUDIT,
  name: "Performance Audit",
  description: "Diagnoses account health against 250+ checks across tracking, structure, creative, bids.",
  validate(input) {
    InputSchema.parse(input);
  },
  async run(_ctx, input) {
    return toolComplete<Output>({
      toolName: "submit_audit_report",
      toolDescription: "Submit the performance audit score and findings.",
      schema: OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      stubData: STUB,
      system: `You are the Performance Audit agent. Score 0-100, emit P0-P3 findings
across tracking, creative fatigue, account structure, bid strategy, audience
overlap, wasted spend. Each finding must be actionable.

Call submit_audit_report with the result. The summary is a one-sentence
headline (≤120 chars) like "Score 82/100 · 5 findings (1 P0 tracking, 3 P1, 1 P2)".`,
      user: JSON.stringify(input),
    });
  },
};
