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

/**
 * POST /api/meta/pixels
 *
 * Body: { name?: string }
 *
 * Creates a fresh Meta Pixel on the connected ad account. Returns the
 * new pixel id + the 1-line install snippet the operator pastes into
 * their site's <head>. The pixel can be referenced as a promoted_object
 * on an AdSet immediately, even before any event has fired — Meta just
 * has nothing to optimize against until events arrive.
 *
 * Tight rate limit (5/hr/org) because pixel creation is rarely needed
 * more than once per ad account, and runaway client code shouldn't be
 * able to clutter the operator's Events Manager.
 */
export async function POST(req: Request) {
  const ctx = await resolveOrgId();
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const limited = await rateLimit(`meta-pixels-create:${ctx.orgId}`, { limit: 5, windowSec: 3600 });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: `Pixel creation rate-limited. Retry in ${limited.retryAfterSec}s.` },
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

  // Default to a sensible name if the operator didn't supply one.
  // Sanitize to alphanumerics + spaces + dashes so we never inject a
  // weird character into Meta's name field that shows up in their UI.
  let name = "EIAAW Pixel";
  try {
    const body = (await req.json()) as { name?: string };
    if (typeof body.name === "string" && body.name.trim()) {
      name = body.name.trim().replace(/[^a-zA-Z0-9 \-_.]/g, "").slice(0, 60) || "EIAAW Pixel";
    }
  } catch {
    // body parse failed — use the default. The operator likely sent no body.
  }

  const client = new MetaClient({ accessToken: tokens.plainAccessToken });
  try {
    const { id } = await client.createPixel(tokens.externalId, name);
    return NextResponse.json({
      ok: true,
      pixel: { id, name, lastFiredAt: null },
      installSnippet: buildPixelSnippet(id),
    });
  } catch (err) {
    if (err instanceof MetaApiError) {
      const detail = err.raw.error_user_msg ?? err.message;
      console.error(
        `[META] createPixel failed: code=${err.code} subcode=${err.subcode ?? "-"} ` +
          `category=${err.category} fbtrace=${err.fbtraceId} userMsg=${JSON.stringify(detail)}`,
      );
      return NextResponse.json({ ok: false, error: `(#${err.code}) ${detail}` }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}

/**
 * Build the standard Meta Pixel install snippet for the given pixel id.
 * Source: https://developers.facebook.com/docs/meta-pixel/get-started
 *
 * The operator pastes this into their site's <head> on every page they
 * want tracked. fbq('track','PageView') fires once on every page load —
 * additional event types (Purchase, Lead, AddToCart) are added inline
 * on the relevant page actions.
 */
function buildPixelSnippet(pixelId: string): string {
  return `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/></noscript>
<!-- End Meta Pixel Code -->`;
}
