import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { resolveOrgId } from "@/lib/resolve-org";
import { rateLimit } from "@/lib/rate-limit";
import { loadTokens } from "@/integrations/token-store";
import { MetaClient } from "@/integrations/meta/client";
import { MetaApiError } from "@/integrations/meta/errors";

/**
 * GET /api/meta/pixels
 *
 * Lists Meta Pixels installed on the connected ad account. Required for
 * OUTCOME_SALES / OUTCOME_LEADS conversion-optimized AdSets.
 *
 * Returns: { ok: true, pixels: [{ id, name, lastFiredAt? }] }
 *      or: { ok: false, error }
 */
export async function GET() {
  const ctx = await resolveOrgId();
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const limited = await rateLimit(`meta-pixels:${ctx.orgId}`, { limit: 30, windowSec: 60 });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: `Rate limit exceeded. Retry in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const tokens = await loadTokens(ctx.orgId, Platform.META);
  if (!tokens?.plainAccessToken || !tokens.externalId) {
    return NextResponse.json(
      { ok: false, error: "Meta is not connected.", requiresReconnect: true },
      { status: 400 },
    );
  }

  const client = new MetaClient({ accessToken: tokens.plainAccessToken });
  try {
    const pixels = await client.listPixels(tokens.externalId, 50);
    return NextResponse.json({
      ok: true,
      pixels: pixels.map((p) => ({
        id: p.id,
        name: p.name,
        lastFiredAt: p.last_fired_time ?? null,
      })),
    });
  } catch (err) {
    if (err instanceof MetaApiError) {
      return NextResponse.json(
        { ok: false, error: err.raw.error_user_msg ?? err.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
