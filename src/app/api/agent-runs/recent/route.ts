import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/agent-runs/recent?limit=40&since=<iso>
 *
 * Returns the latest agent runs for the caller's primary org. Used by the
 * Live monitor page to poll for real-time agent activity. Optional `since`
 * lets the client request only newer rows.
 */
export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user && "id" in session.user ? (session.user as { id: string }).id : undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m = await db.membership.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (!m) return NextResponse.json({ error: "No org" }, { status: 400 });

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 40)));
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;

  const rows = await db.agentRun.findMany({
    where: {
      orgId: m.orgId,
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
      const summary =
        typeof r.output === "object" && r.output && "summary" in r.output
          ? String((r.output as { summary?: string }).summary ?? "").slice(0, 120)
          : "";
      return {
        id: r.id,
        agent: r.kind.toLowerCase().replace(/_/g, "-"),
        status: r.status,
        message: summary || r.error || r.kind.toLowerCase().replace(/_/g, "-"),
        at: r.createdAt.toISOString(),
        endedAt: r.endedAt?.toISOString() ?? null,
      };
    }),
  });
}
