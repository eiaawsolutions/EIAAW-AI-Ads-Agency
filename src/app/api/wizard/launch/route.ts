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

type MetaCreativePayload = {
  pageId: string;
  pixelId?: string;
  landingUrl: string;
  headline: string;
  primaryText: string;
  description?: string;
  cta: string;
  imageHash: string;
};

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
      creatives?: { META?: MetaCreativePayload };
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

  // Creative payloads are per-platform. Validate the META block here when
  // META is selected — defense in depth so a maliciously-crafted client
  // can't ship an empty creative through to the adapter and create an
  // un-deliverable campaign shell on the platform.
  let creatives: { META?: MetaCreativePayload } | undefined;
  if (platforms.includes("META")) {
    const c = (b.creatives as Record<string, unknown> | undefined)?.META as
      | Record<string, unknown>
      | undefined;
    if (!c) return { error: "creative.META payload required when Meta is selected" };

    const pageId = typeof c.pageId === "string" ? c.pageId.trim() : "";
    const landingUrl = typeof c.landingUrl === "string" ? c.landingUrl.trim() : "";
    const headline = typeof c.headline === "string" ? c.headline.trim() : "";
    const primaryText = typeof c.primaryText === "string" ? c.primaryText.trim() : "";
    const description = typeof c.description === "string" ? c.description.trim() : "";
    const cta = typeof c.cta === "string" ? c.cta : "";
    const imageHash = typeof c.imageHash === "string" ? c.imageHash.trim() : "";
    const pixelId = typeof c.pixelId === "string" && c.pixelId.trim() ? c.pixelId.trim() : undefined;

    if (!pageId) return { error: "creative.META.pageId required" };
    if (!landingUrl || !/^https?:\/\/.+/i.test(landingUrl))
      return { error: "creative.META.landingUrl must be a valid http(s) URL" };
    if (!headline) return { error: "creative.META.headline required" };
    if (headline.length > 40) return { error: "creative.META.headline must be <= 40 chars" };
    if (!primaryText) return { error: "creative.META.primaryText required" };
    if (primaryText.length > 125) return { error: "creative.META.primaryText must be <= 125 chars" };
    if (description.length > 30) return { error: "creative.META.description must be <= 30 chars" };
    if (!cta) return { error: "creative.META.cta required" };
    if (!imageHash) return { error: "creative.META.imageHash required (upload image first)" };
    if ((objective === "SALES" || objective === "LEADS") && !pixelId) {
      return {
        error: `creative.META.pixelId required for ${objective} objective — install/select a Meta Pixel`,
      };
    }
    creatives = {
      META: { pageId, pixelId, landingUrl, headline, primaryText, description: description || undefined, cta, imageHash },
    };
  }

  return {
    brandName,
    domain,
    objective,
    monthlyBudget,
    currency,
    targetLocation,
    platforms,
    strategy,
    creatives,
  };
}
