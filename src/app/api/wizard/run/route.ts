import { NextResponse } from "next/server";
import { JobKind } from "@prisma/client";
import { enqueueJob } from "@/jobs/enqueue";
import { rateLimit } from "@/lib/rate-limit";
import { resolveOrgId } from "@/lib/resolve-org";

/**
 * POST /api/wizard/run
 *
 * Kicks off a durable wizard flow: ads-dna → ads-plan → ads-competitor.
 * Returns a correlationId immediately so the UI can poll /api/jobs/:id.
 * Each step's output is persisted in JobStep.output; the UI reads them as
 * they complete.
 *
 * Rate limit: 10 / minute per org. The flow costs real Claude tokens, and
 * a wizard is a one-person operation — if someone hits this 10+ times a
 * minute, something's wrong.
 */

type RunBody = {
  brandName: string;
  domain?: string;
  notes?: string;
  objective: "SALES" | "LEADS" | "APP_INSTALLS" | "TRAFFIC" | "AWARENESS" | "ENGAGEMENT";
  monthlyBudget: number;
  currency?: string;
  platforms: string[];
  targetCpa?: number;
  targetRoas?: number;
  targetLocation?: string;
  market?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as RunBody | null;
  if (!body || !body.brandName || !body.monthlyBudget) {
    return NextResponse.json({ ok: false, error: "missing required fields" }, { status: 400 });
  }

  const ctx = await resolveOrgId();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "no org context" }, { status: 400 });
  }
  const { orgId } = ctx;

  const rl = await rateLimit(`wizard:${orgId}`, { limit: 10, windowSec: 60 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Rate limit exceeded. Retry in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const correlationId = `wiz_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

  const job = await enqueueJob({
    orgId,
    kind: JobKind.WIZARD_RUN,
    correlationId,
    input: {
      brandName: body.brandName,
      monthlyBudget: body.monthlyBudget,
      currency: body.currency ?? "USD",
      targetLocation: body.targetLocation,
    },
    steps: [
      {
        kind: "agent.ads-dna",
        input: { brandName: body.brandName, domain: body.domain, notes: body.notes },
      },
      {
        kind: "agent.ads-plan",
        input: {
          objective: body.objective,
          monthlyBudget: body.monthlyBudget,
          currency: body.currency ?? "USD",
          platforms: body.platforms,
          targetCpa: body.targetCpa,
          targetRoas: body.targetRoas,
          targetLocation: body.targetLocation,
        },
      },
      {
        kind: "agent.ads-competitor",
        input: { brand: body.brandName, market: body.market ?? body.targetLocation ?? "US" },
      },
    ],
  });

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    correlationId: job.correlationId,
    pollUrl: `/api/jobs/${correlationId}`,
  });
}
