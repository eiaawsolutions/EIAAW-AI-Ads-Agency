import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const Schema = z.object({
  kind: z.enum(["DEMO", "DPA", "SECURITY_REVIEW", "RFP", "OTHER"]).default("DEMO"),
  workEmail: z.string().email().max(254),
  fullName: z.string().min(2).max(120),
  company: z.string().min(1).max(120),
  jobTitle: z.string().max(120).optional(),
  monthlySpend: z.string().max(40).optional(),
  platforms: z.string().max(200).optional(),
  message: z.string().max(2000).optional(),
  utmSource: z.string().max(80).optional(),
  utmMedium: z.string().max(80).optional(),
  utmCampaign: z.string().max(80).optional(),
});

function hashIp(ip: string): string {
  const salt = process.env.AUTH_SECRET ?? "fallback-salt";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 32);
}

function rejectFreeMail(email: string): boolean {
  const blocked = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "proton.me", "protonmail.com"];
  const domain = email.toLowerCase().split("@")[1] ?? "";
  return blocked.includes(domain);
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0";

  const limited = await rateLimit(`ent-intake:${ip}`, { limit: 5, windowSec: 600 });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (rejectFreeMail(parsed.data.workEmail)) {
    return NextResponse.json(
      { ok: false, error: "Please use your work email address." },
      { status: 400 },
    );
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 200) ?? null;

  await db.enterpriseLead.create({
    data: {
      ...parsed.data,
      ipHash: hashIp(ip),
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}
