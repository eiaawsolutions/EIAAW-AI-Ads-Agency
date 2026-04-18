/**
 * Built-in job handlers.
 *
 *   agent.<kind>  — dispatch an agent (ads-dna / ads-plan / ...) and save
 *                    its output as the step output. Uses the existing
 *                    agents/dispatcher so cost caps + observability apply.
 *
 *   platform.<platform>.<action>
 *                 — call the platform adapter's execute() method. Used by
 *                    CAMPAIGN_LAUNCH jobs that fan out across platforms.
 */

import { AgentKind } from "@prisma/client";
import { dispatch } from "@/agents/dispatcher";
import { registerHandler } from "./registry";
import type { StepHandler } from "./types";

// agent.ads-dna → AgentKind.ADS_DNA, etc.
function kindFromSlug(slug: string): AgentKind | null {
  const enumName = slug.toUpperCase().replace(/-/g, "_") as AgentKind;
  return (AgentKind as Record<string, AgentKind>)[enumName] ?? null;
}

const agentHandler: StepHandler<{ agent: string; input: unknown }> = async (input, ctx) => {
  const kind = kindFromSlug(input.agent);
  if (!kind) return { ok: false, error: `unknown agent: ${input.agent}` };

  const res = await dispatch(kind, {
    orgId: ctx.orgId,
    executionMode: "AUTONOMOUS", // durable jobs already have human gates at the job level
  }, input.input);

  if (!res.ok) {
    return { ok: false, error: res.error ?? "agent failed" };
  }
  return { ok: true, output: res.output };
};

// Register for every concrete agent kind so step specs can reference them
// directly by kind (e.g. "agent.ads-dna" not "agent").
const AGENT_SLUGS = [
  "ads-dna", "ads-plan", "ads-create", "ads-math", "ads-budget",
  "ads-audit", "ads-creative", "ads-competitor", "ads-landing", "ads-test",
  "ads-generate", "ads-photoshoot",
  "ads-meta", "ads-google", "ads-tiktok", "ads-linkedin",
  "ads-microsoft", "ads-youtube", "ads-apple",
];

let registered = false;

/** Call once at boot (handled by the tick endpoint). Idempotent. */
export function registerBuiltinHandlers(): void {
  if (registered) return;
  registered = true;

  for (const slug of AGENT_SLUGS) {
    registerHandler(`agent.${slug}`, async (input, ctx) =>
      agentHandler({ agent: slug, input }, ctx),
    );
  }
}
