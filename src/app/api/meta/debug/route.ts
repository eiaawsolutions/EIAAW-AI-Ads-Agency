import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { resolveOrgId } from "@/lib/resolve-org";
import { loadTokens } from "@/integrations/token-store";
import { MetaClient, MetaOAuthClient } from "@/integrations/meta";
import { db } from "@/lib/db";

/**
 * GET /api/meta/debug
 *
 * (Originally /api/meta/_debug — renamed because Next.js ignores any
 * route segment beginning with `_` at build time and returns 404.)
 *
 * Diagnostic endpoint for Meta integration. Reports:
 *   - Stored Integration scopes (what we wrote to DB)
 *   - Live token debug from Meta (what scopes Meta says the token has)
 *   - Raw /me/accounts response (Pages with tasks visible)
 *   - Filter outcome (which Pages our listPages() would surface)
 *
 * This is intentionally org-scoped + auth-required so it's safe to leave
 * in production. Returns nothing usable to an attacker — only the calling
 * org's own integration metadata.
 */
export async function GET() {
  const ctx = await resolveOrgId();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const integration = await db.integration.findFirst({
    where: { orgId: ctx.orgId, platform: Platform.META, status: "connected" },
    orderBy: { updatedAt: "desc" },
    select: {
      externalId: true,
      displayName: true,
      scopes: true,
      expiresAt: true,
      updatedAt: true,
    },
  });
  if (!integration) {
    return NextResponse.json({ error: "no Meta integration found" }, { status: 404 });
  }

  const tokens = await loadTokens(ctx.orgId, Platform.META);
  if (!tokens?.plainAccessToken) {
    return NextResponse.json({ error: "Meta token missing on integration row" }, { status: 500 });
  }

  const result: Record<string, unknown> = {
    integration: {
      externalId: integration.externalId,
      displayName: integration.displayName,
      storedScopes: integration.scopes,
      expiresAt: integration.expiresAt,
      updatedAt: integration.updatedAt,
    },
  };

  // Live scope check via debug_token. Meta returns the *currently granted*
  // scopes, which can diverge from what we wrote to DB if the user revoked
  // a permission via Facebook Settings without disconnecting on our side.
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (appId && appSecret) {
    try {
      const oauth = new MetaOAuthClient({ appId, appSecret });
      const debug = await oauth.debugToken(tokens.plainAccessToken);
      result.liveTokenScopes = debug.scopes;
      result.liveTokenIsValid = debug.is_valid;
      result.liveTokenExpiresAt = debug.expires_at
        ? new Date(debug.expires_at * 1000).toISOString()
        : "never";
      result.liveTokenUserId = debug.user_id;
    } catch (err) {
      result.liveTokenError = err instanceof Error ? err.message : String(err);
    }
  }

  // Raw /me/accounts response so we can see exactly what Meta returns
  // (Pages list + per-page tasks). The wizard's "No Pages found" message
  // can mean (a) no Pages, (b) pages_show_list scope missing, or (c)
  // every page filtered out by the ADVERTISE-task filter — this disambiguates.
  const client = new MetaClient({ accessToken: tokens.plainAccessToken });
  try {
    const raw = await client.raw<{ data: Array<{ id: string; name: string; tasks?: string[]; category?: string }>; paging?: unknown }>(
      "GET",
      "/me/accounts",
      { query: { fields: "id,name,category,tasks", limit: 100 } },
    );
    result.rawMeAccountsCount = raw.data?.length ?? 0;
    result.rawMeAccounts = raw.data?.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      tasks: p.tasks ?? null,
      passesAdvertiseFilter: !p.tasks || p.tasks.includes("ADVERTISE"),
    }));
  } catch (err) {
    result.meAccountsError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(result);
}
