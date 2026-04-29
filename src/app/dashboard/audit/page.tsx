import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { getActiveOrgOrRedirect } from "@/lib/active-org";
import { db } from "@/lib/db";

export const metadata = { title: "Audit" };
export const dynamic = "force-dynamic";

type Finding = { sev?: string; area?: string; note?: string; fix?: string };

const SEV_VARIANT: Record<string, "danger" | "warn" | "outline"> = {
  P0: "danger",
  P1: "warn",
  P2: "outline",
  P3: "outline",
};

export default async function AuditPage() {
  const ctx = await getActiveOrgOrRedirect();
  const latest = await db.agentRun.findFirst({
    where: { orgId: ctx.orgId, kind: "ADS_AUDIT", status: "SUCCEEDED" },
    orderBy: { createdAt: "desc" },
  });

  const output = (latest?.output ?? null) as { findings?: Finding[]; score?: number; checks?: number } | null;
  const findings: Finding[] = Array.isArray(output?.findings) ? output!.findings! : [];
  const score = output?.score ?? null;
  const checks = output?.checks ?? null;

  const subtitle = latest
    ? `ads-audit · ${checks ?? "—"} checks${score !== null ? ` · score ${score}/100` : ""}`
    : "ads-audit · run an audit to see findings";

  return (
    <>
      <DashboardTopbar title="Audit" subtitle={subtitle} />
      <main className="p-6">
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <span className="eyebrow">Findings</span>
            <span className="mono text-xs text-muted-foreground tabular">{findings.length}</span>
          </div>
          {findings.length === 0 ? (
            <div className="px-5 py-16 text-center text-xs text-muted-foreground">
              {latest
                ? "Audit ran but returned no findings. Account looks clean."
                : "No audit on record yet. Trigger an ads-audit run from the Agents page."}
            </div>
          ) : (
            findings.map((f, i) => (
              <div
                key={i}
                className={`grid grid-cols-[60px_100px_1fr] gap-4 px-5 py-4 hover:bg-surface-1/50 transition-colors duration-150 ${i > 0 ? "hairline-t" : ""}`}
              >
                <Badge variant={SEV_VARIANT[f.sev ?? "P3"] ?? "outline"} className="w-fit h-fit mt-0.5">
                  {f.sev ?? "P3"}
                </Badge>
                <span className="mono text-xs text-muted-foreground uppercase mt-1">{f.area ?? "general"}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{f.note ?? "—"}</p>
                  {f.fix && <p className="mt-1 text-xs text-muted-foreground">Fix: {f.fix}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
