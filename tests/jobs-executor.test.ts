/**
 * Durable job executor — integration test against live DB.
 * Gated on DATABASE_URL so CI without a DB skips cleanly.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, JobKind, JobStatus } from "@prisma/client";
import { enqueueJob } from "@/jobs/enqueue";
import { runTick } from "@/jobs/executor";
import { registerHandler } from "@/jobs/registry";

const db = new PrismaClient();
const canRun = !!process.env.DATABASE_URL;
const SUITE = canRun ? describe : describe.skip;

SUITE("jobs executor — live DB", () => {
  let orgId = "";

  beforeAll(async () => {
    const org = await db.organization.create({
      data: { slug: `jobs-test-${Math.random().toString(36).slice(2, 8)}`, name: "Jobs Test" },
    });
    orgId = org.id;

    registerHandler("test.ok", async (input) => ({ ok: true, output: { echo: input } }));

    let flaky = 0;
    registerHandler("test.flaky", async () => {
      flaky += 1;
      if (flaky < 2) return { ok: false, error: "transient", retryInSec: 1 };
      return { ok: true, output: { tries: flaky } };
    });

    registerHandler("test.reads-prior", async (_input, ctx) => ({
      ok: true,
      output: { saw: ctx.prior },
    }));
  });

  afterAll(async () => {
    await db.organization.delete({ where: { id: orgId } }).catch(() => null);
    await db.$disconnect();
  });

  it("completes a single-step job in one tick", async () => {
    const { id } = await enqueueJob({
      orgId,
      kind: JobKind.AGENT_CHAIN,
      input: { test: "single" },
      steps: [{ kind: "test.ok", input: { hello: "world" } }],
    });

    const tick = await runTick();
    expect(tick.status).toBe("step_ok");
    expect(tick.jobId).toBe(id);

    const job = await db.jobRun.findUnique({ where: { id }, include: { steps: true } });
    expect(job?.status).toBe(JobStatus.SUCCEEDED);
    expect(job?.cursor).toBe(1);
    expect(job?.steps[0].status).toBe(JobStatus.SUCCEEDED);
    expect((job?.steps[0].output as { echo: unknown }).echo).toEqual({ hello: "world" });
  });

  it("chains prior outputs into later steps", async () => {
    const { id } = await enqueueJob({
      orgId,
      kind: JobKind.AGENT_CHAIN,
      input: {},
      steps: [
        { kind: "test.ok", input: { a: 1 } },
        { kind: "test.reads-prior", input: {} },
      ],
    });

    await runTick();
    await runTick();

    const job = await db.jobRun.findUnique({
      where: { id },
      include: { steps: { orderBy: { index: "asc" } } },
    });
    expect(job?.status).toBe(JobStatus.SUCCEEDED);
    const saw = (job?.steps[1].output as { saw: Record<number, { echo: unknown }> }).saw;
    expect(saw[0].echo).toEqual({ a: 1 });
  });

  it("retries a flaky step then succeeds", async () => {
    const { id } = await enqueueJob({
      orgId,
      kind: JobKind.AGENT_CHAIN,
      input: {},
      steps: [{ kind: "test.flaky", input: {} }],
    });

    const first = await runTick();
    expect(first.status).toBe("step_failed");
    let job = await db.jobRun.findUnique({ where: { id } });
    expect(job?.status).toBe(JobStatus.PENDING);
    await db.jobRun.update({ where: { id }, data: { nextAt: new Date() } });

    const second = await runTick();
    expect(second.status).toBe("step_ok");
    job = await db.jobRun.findUnique({ where: { id } });
    expect(job?.status).toBe(JobStatus.SUCCEEDED);
  });

  it("fails the job when the handler is unknown", async () => {
    const { id } = await enqueueJob({
      orgId,
      kind: JobKind.AGENT_CHAIN,
      input: {},
      steps: [{ kind: "test.does-not-exist", input: {} }],
    });

    const tick = await runTick();
    expect(tick.status).toBe("no_handler");
    const job = await db.jobRun.findUnique({ where: { id } });
    expect(job?.status).toBe(JobStatus.FAILED);
  });

  it("exposes jobs by correlationId", async () => {
    const cid = `corr_${Math.random().toString(36).slice(2, 10)}`;
    const { id } = await enqueueJob({
      orgId,
      kind: JobKind.AGENT_CHAIN,
      input: {},
      correlationId: cid,
      steps: [{ kind: "test.ok", input: {} }],
    });

    const found = await db.jobRun.findFirst({ where: { correlationId: cid } });
    expect(found?.id).toBe(id);
  });
});
