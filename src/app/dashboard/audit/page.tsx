import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { RunAuditButton } from "@/components/dashboard/run-audit-button";
import { getActiveOrgOrRedirect } from "@/lib/active-org";
import { db } from "@/lib/db";

export const metadata = { title: "Audit" };
export const dynamic = "force-dynamic";

type Finding = { sev?: string; severity?: string; area?: string; note?: string; fix?: string };

const SEV_VARIANT: Record<string, "danger" | "warn" | "outline"> = {
  P0: "danger",
  P1: "warn",
  P2: "outline",
  P3: "outline",
};

/**
 * The audit job runs one ads-audit step per connected platform. Each step's
 * AgentRun.output is its own findings list. We fold them all into a single
 * flat list with a platform tag so the page reflects the whole audit.
 */
async function loadFindings(orgId: string) {
  const job = await db.jobRun.findFirst({
    where: { orgId, kind: "AGENT_CHAIN", correlationId: { startsWith: "audit:" }, status: "SUCCEEDED" },
    orderBy: { createdAt: "desc" },
    include: { steps: { orderBy: { index: "asc" }, select: { input: true, output: true } } },
  });

  if (!job) {
    // Fall back to the legacy single-AgentRun shape (still supported).
    const legacy = await db.agentRun.findFirst({
      where: { orgId, kind: "ADS_AUDIT", status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
    });
    if (!legacy) return { findings: [] as Finding[], score: null as number | null, checks: null as number | null, ranAt: null as Date | null };
    const out = legacy.output as { findings?: Finding[]; score?: number; checks?: number } | null;
    return {
      findings: out?.findings ?? [],
      score: out?.score ?? null,
      checks: out?.checks ?? null,
      ranAt: legacy.endedAt ?? legacy.createdAt,
    };
  }

  const findings: Finding[] = [];
  let scoreSum = 0;
  let scoreCount = 0;
  let checks = 0;
  for (const s of job.steps) {
    const out = s.output as { findings?: Finding[]; score?: number; checks?: number } | null;
    const platform =
      (s.input as { platform?: string } | null)?.platform?.toString().toLowerCase() ?? "general";
    if (Array.isArray(out?.findings)) {
      for (const f of out!.findings!) {
        findings.push({ ...f, area: f.area ?? platform });
      }
    }
    if (typeof out?.score === "number") {
      scoreSum += out.score;
      scoreCount += 1;
    }
    if (typeof out?.checks === "number") checks += out.checks;
  }

  return {
    findings,
    score: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
    checks: checks > 0 ? checks : null,
    ranAt: job.endedAt ?? job.createdAt,
  };
}

async function loadInflight(orgId: string) {
  return db.jobRun.findFirst({
    where: {
      orgId,
      kind: "AGENT_CHAIN",
      correlationId: { startsWith: "audit:" },
      status: { in: ["PENDING", "RUNNING"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, cursor: true, createdAt: true },
  });
}

function relTime(d: Date): string {
  const ms = Date.now() - d.getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default async function AuditPage() {
  const ctx = await getActiveOrgOrRedirect();
  const [{ findings, score, checks, ranAt }, inflight] = await Promise.all([
    loadFindings(ctx.orgId),
    loadInflight(ctx.orgId),
  ]);

  const sevRank: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const sortedFindings = [...findings].sort(
    (a, b) => (sevRank[a.sev ?? a.severity ?? "P3"] ?? 9) - (sevRank[b.sev ?? b.severity ?? "P3"] ?? 9),
  );

  const subtitleParts = [
    "ads-audit",
    checks ? `${checks} checks` : null,
    score !== null ? `score ${score}/100` : null,
    ranAt ? `last run ${relTime(ranAt)}` : null,
  ].filter(Boolean) as string[];
  const subtitle = subtitleParts.length > 1 ? subtitleParts.join(" · ") : "ads-audit · run an audit to see findings";

  return (
    <>
      <DashboardTopbar title="Audit" subtitle={subtitle} />
      <main className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            {inflight && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="live-dot" />
                <span>
                  Audit in progress · enqueued {relTime(inflight.createdAt)} · status {inflight.status.toLowerCase()}
                </span>
              </div>
            )}
          </div>
          <RunAuditButton />
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <span className="eyebrow">Findings</span>
            <span className="mono text-xs text-muted-foreground tabular">{sortedFindings.length}</span>
          </div>
          {sortedFindings.length === 0 ? (
            <div className="px-5 py-16 text-center text-xs text-muted-foreground">
              {ranAt
                ? "Audit ran but returned no findings. Account looks clean."
                : inflight
                  ? "First audit is running. Findings will appear here when it finishes."
                  : "No audit on record yet. Click “Run audit” — we will also auto-run one when you connect a platform and weekly thereafter."}
            </div>
          ) : (
            sortedFindings.map((f, i) => {
              const sev = (f.sev ?? f.severity ?? "P3").toUpperCase();
              return (
                <div
                  key={i}
                  className={`grid grid-cols-[60px_100px_1fr] gap-4 px-5 py-4 hover:bg-surface-1/50 transition-colors duration-150 ${i > 0 ? "hairline-t" : ""}`}
                >
                  <Badge variant={SEV_VARIANT[sev] ?? "outline"} className="w-fit h-fit mt-0.5">
                    {sev}
                  </Badge>
                  <span className="mono text-xs text-muted-foreground uppercase mt-1">{f.area ?? "general"}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.note ?? "—"}</p>
                    {f.fix && <p className="mt-1 text-xs text-muted-foreground">Fix: {f.fix}</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
