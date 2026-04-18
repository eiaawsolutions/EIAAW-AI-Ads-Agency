import { NextResponse } from "next/server";
import { runTick } from "@/jobs/executor";

/**
 * POST /api/_internal/worker/tick
 *
 * Job-queue poller. Invoked by Railway's scheduler (every ~10s in prod)
 * or manually via curl for dev. Single-shot: picks one ready job, runs
 * one step, returns a summary.
 *
 * Auth: shared secret via X-EIAAW-Worker-Secret header. Cron jobs on
 * Railway can set this via a scheduled service env var.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.EIAAW_WORKER_SECRET;
  if (secret && req.headers.get("x-eiaaw-worker-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runTick();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// Allow GET for manual smoke checks (dev only, no side effects if secret set).
export async function GET(req: Request) {
  return POST(req);
}
