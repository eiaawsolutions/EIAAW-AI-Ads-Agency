import { AgentKind, Platform } from "@prisma/client";
import { z } from "zod";
import type { Agent } from "../types";
import { getAdapter } from "@/integrations/registry";

const InputSchema = z.object({
  action: z.enum(["launch", "pause", "optimize", "sync_metrics"]),
  campaignId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export function makePlatformAgent(kind: AgentKind, platform: Platform, name: string): Agent<z.infer<typeof InputSchema>, unknown> {
  return {
    kind,
    name,
    description: `Operates ${platform} ad campaigns via the platform adapter.`,
    validate(input) {
      InputSchema.parse(input);
    },
    async run(ctx, input) {
      const adapter = getAdapter(platform);
      try {
        const output = await adapter.execute(ctx, input);
        return { ok: true, output, tokensIn: 0, tokensOut: 0, costUsd: 0 };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          tokensIn: 0,
          tokensOut: 0,
          costUsd: 0,
        };
      }
    },
  };
}
