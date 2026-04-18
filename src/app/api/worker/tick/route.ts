import { NextResponse } from "next/server";
import { drainQueue, runTick } from "@/jobs/executor";

/**
 * POST /api/worker/tick
 *
 * Job-queue poller. Invoked by Railway Cron (1-min cadence). Each hit
 * drains up to 4 ticks with 15s spacing — effective 15s cadence for
 * background work inside Railway's 60s HTTP ceiling.
 *
 * Query params:
 *   ?mode=single  — single-shot runTick (useful for dev/smoke, fast reply)
 *   default       — drainQueue (max 4 ticks × 15s)
 *
 * Auth: shared secret via X-EIAAW-Worker-Secret header. Locked down
 * whenever EIAAW_WORKER_SECRET is set (always, in production).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.EIAAW_WORKER_SECRET;
  if (secret && req.headers.get("x-eiaaw-worker-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = new URL(req.url).searchParams.get("mode");

  try {
    if (mode === "single") {
      const tick = await runTick();
      return NextResponse.json({ ok: true, mode: "single", ...tick });
    }

    const drained = await drainQueue();
    return NextResponse.json({ ok: true, mode: "drain", ...drained });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// GET for manual smoke checks — same auth requirement.
export async function GET(req: Request) {
  return POST(req);
}
