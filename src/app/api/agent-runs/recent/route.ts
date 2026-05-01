import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthedOrg } from "@/lib/resolve-org";
import { summarizeOutput, formatRunError } from "@/lib/agent-run-summary";

/**
 * GET /api/agent-runs/recent?limit=40&since=<iso>
 *
 * Returns the latest agent runs for the caller's primary org. Used by the
 * Live monitor page to poll for real-time agent activity. Optional `since`
 * lets the client request only newer rows.
 */
export async function GET(req: Request) {
  const ctx = await resolveAuthedOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 40)));
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;

  const rows = await db.agentRun.findMany({
    where: {
      orgId: ctx.orgId,
      ...(since && !Number.isNaN(since.getTime()) ? { createdAt: { gt: since } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      status: true,
      output: true,
      error: true,
      createdAt: true,
      endedAt: true,
    },
  });

  return NextResponse.json({
    runs: rows.map((r) => {
      const agentSlug = r.kind.toLowerCase().replace(/_/g, "-");
      const message =
        r.status === "FAILED"
          ? formatRunError(r.error, agentSlug)
          : summarizeOutput(r.kind, r.output, agentSlug);
      return {
        id: r.id,
        agent: agentSlug,
        status: r.status,
        message,
        at: r.createdAt.toISOString(),
        endedAt: r.endedAt?.toISOString() ?? null,
      };
    }),
  });
}
