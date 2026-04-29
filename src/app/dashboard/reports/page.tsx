import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { getActiveOrgOrRedirect } from "@/lib/active-org";
import { db } from "@/lib/db";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function summaryText(s: unknown): string {
  if (!s) return "";
  if (typeof s === "string") return s;
  if (typeof s === "object" && s && "summary" in s) {
    const v = (s as { summary?: unknown }).summary;
    if (typeof v === "string") return v;
  }
  if (typeof s === "object" && s && "headline" in s) {
    const v = (s as { headline?: unknown }).headline;
    if (typeof v === "string") return v;
  }
  return "";
}

export default async function ReportsPage() {
  const ctx = await getActiveOrgOrRedirect();

  const reports = await db.report.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <>
      <DashboardTopbar title="Reports" subtitle="Daily / weekly / monthly · AI-generated" />
      <main className="p-6">
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {reports.length === 0 ? (
            <div className="px-5 py-16 text-center text-xs text-muted-foreground">
              No reports yet. Reports are generated automatically by the worker on daily/weekly/monthly cadence.
            </div>
          ) : (
            reports.map((r, i) => (
              <div key={r.id} className={`px-5 py-5 ${i > 0 ? "hairline-t" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="mono text-xs text-muted-foreground tabular shrink-0">{fmtDate(r.createdAt)}</span>
                      <h3 className="text-sm font-medium text-foreground">{r.name}</h3>
                      <Badge variant="outline">{r.cadence}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-3xl">
                      {summaryText(r.summary) || "No summary captured."}
                    </p>
                  </div>
                  <Button variant="subtle" size="sm" disabled={!r.pdfUrl} asChild={!!r.pdfUrl}>
                    {r.pdfUrl ? (
                      <a href={r.pdfUrl} target="_blank" rel="noreferrer">
                        <FileDown className="h-3 w-3" /> PDF
                      </a>
                    ) : (
                      <span>
                        <FileDown className="h-3 w-3" /> PDF
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
