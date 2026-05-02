import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { resolveOrgId } from "@/lib/resolve-org";
import { rateLimit } from "@/lib/rate-limit";
import { loadTokens } from "@/integrations/token-store";
import { MetaClient } from "@/integrations/meta/client";
import { MetaApiError } from "@/integrations/meta/errors";

/**
 * GET /api/meta/pages
 *
 * Lists Facebook Pages the connected Meta user can advertise on. Used by
 * the wizard's Creative step to populate the Page picker.
 *
 * Returns: { ok: true, pages: [{ id, name, category }] }
 *      or: { ok: false, error, requiresReconnect?: true }
 *
 * `requiresReconnect: true` is set when the token lacks pages_show_list
 * scope — the UI uses it to surface a "Reconnect Meta" button instead of
 * a generic error.
 */
export async function GET() {
  const ctx = await resolveOrgId();
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const limited = await rateLimit(`meta-pages:${ctx.orgId}`, { limit: 30, windowSec: 60 });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: `Rate limit exceeded. Retry in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const tokens = await loadTokens(ctx.orgId, Platform.META);
  if (!tokens?.plainAccessToken) {
    return NextResponse.json(
      { ok: false, error: "Meta is not connected.", requiresReconnect: true },
      { status: 400 },
    );
  }

  const client = new MetaClient({ accessToken: tokens.plainAccessToken });
  try {
    const pages = await client.listPages(100);
    return NextResponse.json({
      ok: true,
      pages: pages.map((p) => ({ id: p.id, name: p.name, category: p.category })),
    });
  } catch (err) {
    if (err instanceof MetaApiError) {
      // (#200) "permissions" or (#10) "missing scope" → token doesn't have
      // pages_show_list. Force the user to reconnect with the new scopes.
      const needsScope =
        err.code === 200 ||
        err.code === 10 ||
        /permission|scope/i.test(err.raw.error_user_msg ?? err.message);
      return NextResponse.json(
        {
          ok: false,
          error: needsScope
            ? "Meta token is missing the pages_show_list scope. Reconnect Meta to grant page access."
            : err.raw.error_user_msg ?? err.message,
          requiresReconnect: needsScope,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
