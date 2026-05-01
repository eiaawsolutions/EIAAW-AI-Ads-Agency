import { AgentKind, AgentRunStatus } from "@prisma/client";
import { db } from "./db";

export type Milestone = {
  key: "dna" | "plan" | "competitor" | "integration" | "audit";
  title: string;
  done: boolean;
  /** One-line proof shown when done (e.g. "META 40% · GOOGLE 40% · TIKTOK 20%"). */
  proof?: string;
};

export type SetupStatus = {
  milestones: Milestone[];
  /** Index of the first incomplete milestone, -1 if all done. */
  nextIndex: number;
  allDone: boolean;
  /** Convenience: did the user connect at least one platform? */
  hasIntegration: boolean;
};

const MILESTONE_TITLES: Record<Milestone["key"], string> = {
  dna: "Brand DNA extracted",
  plan: "Strategy built",
  competitor: "Competitors mapped",
  integration: "Ad platform connected",
  audit: "First audit complete",
};

/**
 * Resolve the org's setup progress. Used by the dashboard onboarding hero
 * to celebrate completed work and propose the next step (in autopilot or
 * guided mode).
 *
 * Detection rules (all queries scoped to orgId):
 *   - dna       : latest SUCCEEDED ADS_DNA AgentRun exists
 *   - plan      : latest SUCCEEDED ADS_PLAN AgentRun exists
 *   - competitor: latest SUCCEEDED ADS_COMPETITOR AgentRun exists
 *   - integration: at least one Integration with status="connected"
 *   - audit     : latest SUCCEEDED ADS_AUDIT AgentRun exists
 *
 * Proof strings come straight from the agent's `summary` field when present
 * (every agent now emits one via toolComplete). Falls back to a derived
 * one-liner if the run pre-dates the summary rollout.
 */
export async function loadSetupStatus(orgId: string): Promise<SetupStatus> {
  const [dnaRun, planRun, competitorRun, auditRun, integrationCount] = await Promise.all([
    db.agentRun.findFirst({
      where: { orgId, kind: AgentKind.ADS_DNA, status: AgentRunStatus.SUCCEEDED },
      orderBy: { createdAt: "desc" },
      select: { output: true },
    }),
    db.agentRun.findFirst({
      where: { orgId, kind: AgentKind.ADS_PLAN, status: AgentRunStatus.SUCCEEDED },
      orderBy: { createdAt: "desc" },
      select: { output: true },
    }),
    db.agentRun.findFirst({
      where: { orgId, kind: AgentKind.ADS_COMPETITOR, status: AgentRunStatus.SUCCEEDED },
      orderBy: { createdAt: "desc" },
      select: { output: true },
    }),
    db.agentRun.findFirst({
      where: { orgId, kind: AgentKind.ADS_AUDIT, status: AgentRunStatus.SUCCEEDED },
      orderBy: { createdAt: "desc" },
      select: { output: true },
    }),
    db.integration.count({ where: { orgId, status: "connected" } }),
  ]);

  const milestones: Milestone[] = [
    {
      key: "dna",
      title: MILESTONE_TITLES.dna,
      done: Boolean(dnaRun),
      proof: dnaRun ? proofForDna(dnaRun.output) : undefined,
    },
    {
      key: "plan",
      title: MILESTONE_TITLES.plan,
      done: Boolean(planRun),
      proof: planRun ? proofForPlan(planRun.output) : undefined,
    },
    {
      key: "competitor",
      title: MILESTONE_TITLES.competitor,
      done: Boolean(competitorRun),
      proof: competitorRun ? proofForCompetitor(competitorRun.output) : undefined,
    },
    {
      key: "integration",
      title: MILESTONE_TITLES.integration,
      done: integrationCount > 0,
      proof: integrationCount > 0 ? `${integrationCount} platform${integrationCount === 1 ? "" : "s"} connected` : undefined,
    },
    {
      key: "audit",
      title: MILESTONE_TITLES.audit,
      done: Boolean(auditRun),
      proof: auditRun ? proofForAudit(auditRun.output) : undefined,
    },
  ];

  const nextIndex = milestones.findIndex((m) => !m.done);
  return {
    milestones,
    nextIndex,
    allDone: nextIndex === -1,
    hasIntegration: integrationCount > 0,
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readSummary(output: unknown): string | undefined {
  if (!isObj(output)) return undefined;
  const s = output.summary;
  return typeof s === "string" && s.trim() ? s : undefined;
}

function proofForDna(output: unknown): string {
  const summary = readSummary(output);
  if (summary) return summary;
  if (!isObj(output)) return "ready";
  const personas = Array.isArray(output.personas) ? output.personas.length : 0;
  const palette = isObj(output.colorPalette) ? output.colorPalette.primary : undefined;
  const parts = [
    personas ? `${personas} persona${personas === 1 ? "" : "s"}` : null,
    typeof palette === "string" ? `palette ${palette}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "ready";
}

function proofForPlan(output: unknown): string {
  const summary = readSummary(output);
  if (summary) return summary;
  if (!isObj(output) || !isObj(output.allocation)) return "ready";
  return Object.entries(output.allocation)
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3)
    .map(([k, v]) => `${k} ${Math.round(Number(v) * 100)}%`)
    .join(" · ");
}

function proofForCompetitor(output: unknown): string {
  const summary = readSummary(output);
  if (summary) return summary;
  if (!isObj(output)) return "ready";
  const c = Array.isArray(output.competitors) ? output.competitors.length : 0;
  return c ? `${c} competitor${c === 1 ? "" : "s"} mapped` : "ready";
}

function proofForAudit(output: unknown): string {
  const summary = readSummary(output);
  if (summary) return summary;
  if (!isObj(output)) return "ready";
  const score = typeof output.score === "number" ? output.score : null;
  const findings = Array.isArray(output.findings) ? output.findings.length : 0;
  if (score !== null && findings) return `Score ${score}/100 · ${findings} finding${findings === 1 ? "" : "s"}`;
  if (score !== null) return `Score ${score}/100`;
  return "ready";
}
