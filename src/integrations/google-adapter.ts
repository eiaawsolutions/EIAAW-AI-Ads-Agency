import { Platform } from "@prisma/client";
import type { PlatformAdapter } from "./types";
import { stubAdapter } from "./_stub";
import { GoogleAdsClient, GoogleOAuthClient, ADWORDS_SCOPE } from "./google";
import { loadTokens, saveRefreshedTokens } from "./token-store";
import { db } from "@/lib/db";
import type { SearchRow } from "./google";

/**
 * Google Ads adapter.
 *
 * Live mode activates when GOOGLE_ADS_CLIENT_ID + GOOGLE_ADS_CLIENT_SECRET +
 * GOOGLE_ADS_DEVELOPER_TOKEN are all present in env (Infisical-resolved at
 * boot via instrumentation.ts). Without them the adapter falls back to the
 * shared sandbox stub — zero-config dev remains intact.
 *
 * All Google Ads API calls go through src/integrations/google/client.ts,
 * which is fetch-based and fully testable with the same mockFetch harness
 * used by the Meta tests.
 *
 * Notes:
 *  - Refresh-token rotation is handled inline in execute(): if the access
 *    token has expired (or expires within 60s), we call OAuth.refresh()
 *    and persist the new access_token + expiresAt before issuing the call.
 *  - GOOGLE_ADS_LOGIN_CUSTOMER_ID is optional. When set, every API call
 *    includes the `login-customer-id` header pointing at the EIAAW MCC
 *    (398-206-7298). This is required for any client account linked under
 *    the agency MCC; direct (unlinked) customer queries don't need it.
 *  - The Integration row's externalId stores the customer ID (10 digits,
 *    no dashes). This is the row the agent talks to when issuing actions.
 */

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
const LOGIN_CUSTOMER_ID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
const STUB = stubAdapter(Platform.GOOGLE, "https://accounts.google.com/o/oauth2/v2/auth");

export const googleAdapter: PlatformAdapter =
  CLIENT_ID && CLIENT_SECRET && DEVELOPER_TOKEN ? liveAdapter() : STUB;

function liveAdapter(): PlatformAdapter {
  const oauth = new GoogleOAuthClient({
    clientId: CLIENT_ID!,
    clientSecret: CLIENT_SECRET!,
  });

  return {
    platform: Platform.GOOGLE,
    mode: "live",

    authUrl(redirectUri, state) {
      return oauth.authorizationUrl(redirectUri, state);
    },

    async exchangeCode(code, redirectUri) {
      const tokens = await oauth.exchangeCode(code, redirectUri);

      // Discover the first accessible customer ID so the Integration row
      // has a stable externalId. If the MCC is set as login-customer-id,
      // this returns customers managed by the MCC; otherwise it returns
      // accounts the user owns directly.
      const probe = new GoogleAdsClient({
        accessToken: tokens.accessToken,
        developerToken: DEVELOPER_TOKEN!,
        loginCustomerId: LOGIN_CUSTOMER_ID,
      });
      const resourceNames = await probe.listAccessibleCustomers().catch(() => []);
      const externalId = resourceNames[0]?.replace(/^customers\//, "") ?? undefined;

      let displayName = "Google Ads";
      if (externalId) {
        const rows = await probe
          .search<SearchRow>(
            externalId,
            "SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1",
          )
          .catch(() => [] as SearchRow[]);
        const name = rows[0]?.customer?.descriptiveName;
        if (name) displayName = name;
      }

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scopes: tokens.scope ? tokens.scope.split(" ") : [ADWORDS_SCOPE],
        externalId,
        displayName,
      };
    },

    async execute(ctx, input) {
      const stored = await loadTokens(ctx.orgId, Platform.GOOGLE);
      if (!stored?.plainAccessToken) {
        throw new Error("[GOOGLE] no connected integration — OAuth first");
      }

      // Refresh access_token if expired or expiring within 60s.
      let accessToken = stored.plainAccessToken;
      if (stored.expiresAt && stored.expiresAt.getTime() - Date.now() < 60_000) {
        if (!stored.plainRefreshToken) {
          throw new Error(
            "[GOOGLE] access token expired and no refresh_token stored — reconnect required",
          );
        }
        const refreshed = await oauth.refresh(stored.plainRefreshToken);
        accessToken = refreshed.accessToken;
        if (stored.externalId) {
          await saveRefreshedTokens({
            orgId: ctx.orgId,
            platform: Platform.GOOGLE,
            externalId: stored.externalId,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken ?? stored.plainRefreshToken,
            expiresAt: refreshed.expiresAt,
          });
        }
      }

      const client = new GoogleAdsClient({
        accessToken,
        developerToken: DEVELOPER_TOKEN!,
        loginCustomerId: LOGIN_CUSTOMER_ID,
      });

      const customerId = String(input.payload?.customerId ?? stored.externalId ?? "");
      if (!customerId) throw new Error("[GOOGLE] customerId required in payload");

      switch (input.action) {
        case "sync_metrics": {
          const days = Number(input.payload?.days ?? 7);
          const since = new Date();
          since.setUTCDate(since.getUTCDate() - days);
          const sinceStr = since.toISOString().slice(0, 10);
          const untilStr = new Date().toISOString().slice(0, 10);

          const rows = await client.searchStream<SearchRow>(
            customerId,
            `
              SELECT
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value
              FROM customer
              WHERE segments.date BETWEEN '${sinceStr}' AND '${untilStr}'
            `.trim(),
          );

          const summed = rows.reduce(
            (a, r) => ({
              impressions: a.impressions + toInt(r.metrics?.impressions),
              clicks: a.clicks + toInt(r.metrics?.clicks),
              spend: a.spend + microsToMinor(r.metrics?.costMicros),
              conversions: a.conversions + Math.round(r.metrics?.conversions ?? 0),
              revenue: a.revenue + Math.round((r.metrics?.conversionsValue ?? 0) * 100),
            }),
            { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 },
          );

          // Best-effort audit log — fire-and-forget.
          db.auditLog
            .create({
              data: {
                orgId: ctx.orgId,
                action: "google.sync_metrics",
                meta: { customerId, days, rowCount: rows.length },
              },
            })
            .catch(() => null);

          return {
            action: input.action,
            metrics: summed,
            log: [`[GOOGLE] sync_metrics ${rows.length} daily rows for cid=${customerId}`],
          };
        }

        // Write actions are gated until Standard Access is granted; we
        // expose them as no-ops with explicit guidance so the agent UI
        // can show a "requires Standard Access" affordance.
        case "launch":
        case "pause":
        case "activate":
        case "optimize":
          return {
            action: input.action,
            log: [
              `[GOOGLE] ${input.action} not yet supported — Explorer Access tier is read-only. ` +
                `Request Standard Access from Google Ads API Center to enable writes.`,
            ],
          };

        default:
          return { action: input.action, log: [`[GOOGLE] unknown action`] };
      }
    },
  };
}

function toInt(v: string | number | undefined | null): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? Number.parseInt(v, 10) : v;
  return Number.isFinite(n) ? n : 0;
}

function microsToMinor(v: string | number | undefined | null): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / 10_000);
}
