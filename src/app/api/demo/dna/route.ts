import { NextResponse } from "next/server";
import { AgentKind } from "@prisma/client";
import { z } from "zod";
import { dispatch } from "@/agents/dispatcher";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { createHash } from "node:crypto";

/**
 * Public demo endpoint — runs the real ads-dna agent on a visitor-supplied URL.
 *
 * Abuse controls (defense-in-depth):
 *   1. Email gate     — must look like a work email (no major free providers)
 *   2. Per-email RL   — 1 demo / 60 min  (prevents same lead spamming refresh)
 *   3. Per-IP RL      — 3 demos / 60 min (prevents email-cycling abuse)
 *   4. Daily org cap  — DEMO_DAILY_CAP runs total (default 50)
 *                       Breaks the abuse path before it touches Anthropic.
 *
 * Lead capture: each successful run writes an EnterpriseLead(kind=OTHER) so
 * sales sees who tried the live demo and what URL they tried.
 */

const Schema = z.object({
  url: z.string().url().max(500),
  workEmail: z.string().email().max(254),
  fullName: z.string().min(2).max(120).optional(),
  company: z.string().max(120).optional(),
});

const DAILY_CAP = Number(process.env.DEMO_DAILY_CAP ?? 50);

function hashIp(ip: string): string {
  const salt = process.env.AUTH_SECRET ?? "fallback-salt";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 32);
}

function rejectFreeMail(email: string): boolean {
  const blocked = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "proton.me", "protonmail.com"];
  const domain = email.toLowerCase().split("@")[1] ?? "";
  return blocked.includes(domain);
}

function brandFromUrl(url: string): { brandName: string; domain: string } {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, "");
  const root = host.split(".").slice(0, -1).join(".") || host;
  const brandName = root
    .split(/[-_.]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
  return { brandName: brandName || host, domain: `https://${host}` };
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0";

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  if (rejectFreeMail(parsed.data.workEmail)) {
    return NextResponse.json(
      { ok: false, error: "Use a work email — we run the demo for businesses." },
      { status: 400 },
    );
  }

  // Per-email RL — strictest of the three.
  const byEmail = await rateLimit(`demo-dna:em:${parsed.data.workEmail}`, { limit: 1, windowSec: 3600 });
  if (!byEmail.ok) {
    return NextResponse.json(
      { ok: false, error: `One demo per hour. Try again in ${Math.ceil(byEmail.retryAfterSec / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(byEmail.retryAfterSec) } },
    );
  }

  const byIp = await rateLimit(`demo-dna:ip:${ip}`, { limit: 3, windowSec: 3600 });
  if (!byIp.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many demos from this network. Try again later." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfterSec) } },
    );
  }

  // Hard daily cap so a single bad day can't drain the Anthropic budget.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const todayCount = await db.agentRun.count({
    where: { kind: AgentKind.ADS_DNA, createdAt: { gte: startOfDay }, org: { slug: "demo" } },
  });
  if (todayCount >= DAILY_CAP) {
    return NextResponse.json(
      { ok: false, error: "Demo capacity reached for today. Book a call instead.", capped: true },
      { status: 429 },
    );
  }

  const demoOrg = await db.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { slug: "demo", name: "Demo" },
  });

  const { brandName, domain } = brandFromUrl(parsed.data.url);

  const result = await dispatch(AgentKind.ADS_DNA, { orgId: demoOrg.id, executionMode: "ASSISTED" }, {
    brandName,
    domain,
  });

  // Capture lead regardless of agent outcome — they showed intent.
  await db.enterpriseLead.create({
    data: {
      kind: "OTHER",
      workEmail: parsed.data.workEmail,
      fullName: parsed.data.fullName ?? "—",
      company: parsed.data.company ?? brandName,
      message: `Live demo: ads-dna on ${parsed.data.url}`,
      ipHash: hashIp(ip),
      userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
      utmSource: "live-demo",
    },
  }).catch(() => undefined);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? "Run failed" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    brand: { name: brandName, domain },
    output: result.output,
    model: result.model,
    stubbed: result.stubbed ?? false,
  });
}
