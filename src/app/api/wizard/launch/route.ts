import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { resolveOrgId } from "@/lib/resolve-org";
import { rateLimit } from "@/lib/rate-limit";
import { launchCampaign } from "@/lib/campaign-launch";
import { checkMonthlyBudget } from "@/lib/budget-floor";

const VALID_OBJECTIVES = ["SALES", "LEADS", "APP_INSTALLS", "TRAFFIC", "AWARENESS", "ENGAGEMENT"] as const;
const VALID_PLATFORMS = new Set<Platform>(Object.values(Platform));

export async function POST(req: Request) {
  const ctx = await resolveOrgId();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limited = await rateLimit(`wizard-launch:${ctx.orgId}`, { limit: 12, windowSec: 3600 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many launches. Retry in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const outcome = await launchCampaign({ ...parsed, orgId: ctx.orgId, userId: ctx.userId });
    return NextResponse.json({ ok: true, ...outcome });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[wizard.launch] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type ParsedBody =
  | {
      brandName: string;
      domain?: string;
      objective: (typeof VALID_OBJECTIVES)[number];
      monthlyBudget: number;
      currency: string;
      targetLocation: string;
      platforms: Platform[];
      strategy?: Record<string, unknown>;
    }
  | { error: string };

function parseBody(raw: unknown): ParsedBody {
  if (!raw || typeof raw !== "object") return { error: "body must be an object" };
  const b = raw as Record<string, unknown>;

  const brandName = typeof b.brandName === "string" ? b.brandName.trim() : "";
  if (!brandName) return { error: "brandName required" };

  const objective = b.objective as (typeof VALID_OBJECTIVES)[number];
  if (!VALID_OBJECTIVES.includes(objective)) {
    return { error: `objective must be one of ${VALID_OBJECTIVES.join(", ")}` };
  }

  const monthlyBudget = Number(b.monthlyBudget);
  const currency = typeof b.currency === "string" && b.currency ? b.currency : "USD";

  // Safety floor — defense in depth in case the wizard validation is
  // bypassed. Meta rejects daily_budget < $5 USD with #100 subcode 2446375
  // ("This campaign's budget is too small."). The floor module makes the
  // limit visible in one place and gives operators an actionable message.
  const budgetCheck = checkMonthlyBudget(monthlyBudget, currency);
  if (!budgetCheck.ok) {
    return { error: budgetCheck.reason };
  }
  const targetLocation =
    typeof b.targetLocation === "string" && b.targetLocation ? b.targetLocation : "Worldwide";

  if (!Array.isArray(b.platforms) || b.platforms.length === 0) {
    return { error: "platforms must be a non-empty array" };
  }
  const platforms: Platform[] = [];
  for (const p of b.platforms) {
    if (typeof p !== "string") return { error: "platform entries must be strings" };
    const upper = p.toUpperCase() as Platform;
    if (!VALID_PLATFORMS.has(upper)) return { error: `unknown platform: ${p}` };
    if (!platforms.includes(upper)) platforms.push(upper);
  }

  const strategy =
    b.strategy && typeof b.strategy === "object" ? (b.strategy as Record<string, unknown>) : undefined;
  const domain = typeof b.domain === "string" ? b.domain : undefined;

  return { brandName, domain, objective, monthlyBudget, currency, targetLocation, platforms, strategy };
}
