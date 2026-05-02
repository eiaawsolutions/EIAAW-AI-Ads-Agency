import { Platform } from "@prisma/client";
import type { PlatformAdapter } from "./types";
import { stubAdapter } from "./_stub";
import { MetaClient, MetaOAuthClient } from "./meta";
import type { MetaCampaignObjective } from "./meta/types";
import { loadTokens } from "./token-store";
import { db } from "@/lib/db";

/**
 * Map our internal Campaign.objective enum to Meta Marketing API's
 * "OUTCOME_*" objectives.
 *
 * Meta deprecated the legacy objective names (SALES, LEADS, TRAFFIC, etc.)
 * in favor of Outcome-Driven Ad Experiences (ODAX). Sending a bare
 * "SALES" produces error #100 "Objective is invalid" — see
 * https://developers.facebook.com/docs/marketing-api/campaign/overview
 *
 * Mapping rationale:
 *   SALES         -> OUTCOME_SALES         (purchase / conversion)
 *   LEADS         -> OUTCOME_LEADS         (form fill / lead gen)
 *   APP_INSTALLS  -> OUTCOME_APP_PROMOTION (install / app event)
 *   TRAFFIC       -> OUTCOME_TRAFFIC       (link click / landing page view)
 *   AWARENESS     -> OUTCOME_AWARENESS     (reach / brand awareness)
 *   ENGAGEMENT    -> OUTCOME_ENGAGEMENT    (post engagement / video views)
 */
const OBJECTIVE_MAP: Record<string, MetaCampaignObjective> = {
  SALES: "OUTCOME_SALES",
  LEADS: "OUTCOME_LEADS",
  APP_INSTALLS: "OUTCOME_APP_PROMOTION",
  TRAFFIC: "OUTCOME_TRAFFIC",
  AWARENESS: "OUTCOME_AWARENESS",
  ENGAGEMENT: "OUTCOME_ENGAGEMENT",
};

function toMetaObjective(input: unknown): MetaCampaignObjective {
  const key = String(input ?? "SALES").toUpperCase();
  // Pass through if the caller already gave us a Meta-native value.
  if (key.startsWith("OUTCOME_")) return key as MetaCampaignObjective;
  return OBJECTIVE_MAP[key] ?? "OUTCOME_SALES";
}

/**
 * Meta adapter.
 *
 * Live mode activates automatically when META_APP_ID + META_APP_SECRET are
 * set in the environment. Without them we fall back to the stub that ships
 * realistic mock metrics — zero-config dev remains intact.
 *
 * All Graph API calls go through src/integrations/meta/client.ts, which is
 * fully tested with a mockFetch harness.
 */

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const STUB = stubAdapter(Platform.META, "https://www.facebook.com/v21.0/dialog/oauth");

export const metaAdapter: PlatformAdapter = APP_ID && APP_SECRET ? liveAdapter() : STUB;

function liveAdapter(): PlatformAdapter {
  const oauth = new MetaOAuthClient({ appId: APP_ID!, appSecret: APP_SECRET! });

  return {
    platform: Platform.META,
    mode: "live",

    authUrl(redirectUri, state) {
      return oauth.authorizationUrl(redirectUri, state);
    },

    async exchangeCode(code, redirectUri) {
      const short = await oauth.exchangeCode(code, redirectUri);
      // Upgrade to ~60d long-lived token so we don't churn through refresh.
      const long = await oauth.exchangeForLongLived(short.accessToken).catch(() => short);
      // Debug to extract scopes for the Integration row. user_id is captured
      // for telemetry only — DO NOT use it as adAccountId.
      const debug = await oauth.debugToken(long.accessToken).catch(() => null);

      // Resolve the user's ad accounts. We need the first usable account_id
      // to store as externalId — the rest of the codebase (campaign launch,
      // insights sync, retry) treats Integration.externalId as the AD ACCOUNT
      // ID and prefixes it with `act_` before calling Meta. Storing the
      // user's Facebook UID here was the original bug — it produced calls
      // like POST /act_<USER_ID>/campaigns which Meta rejects with
      // "Object does not exist or no permission".
      let adAccountId: string | undefined;
      let displayName = "Meta";
      try {
        const client = new MetaClient({ accessToken: long.accessToken });
        const accounts = await client.listAdAccounts(50);
        // Pick the first account_status=1 (active) account; fall back to any.
        const usable = accounts.find((a) => a.account_status === 1) ?? accounts[0];
        if (usable) {
          // listAdAccounts returns id like "act_1234567890" and account_id
          // like "1234567890". Store the bare account_id — the client adds
          // the `act_` prefix at call time via qualifiedAccountId().
          adAccountId = usable.account_id ?? usable.id?.replace(/^act_/, "");
          displayName = usable.name ? `Meta · ${usable.name}` : "Meta";
        }
      } catch (err) {
        console.warn(
          "[META] listAdAccounts during OAuth failed:",
          err instanceof Error ? err.message : String(err),
        );
      }

      if (!adAccountId) {
        throw new Error(
          "Meta OAuth succeeded but no ad accounts are accessible. Open Business Manager and ensure your user has at least one ad account assigned, then reconnect.",
        );
      }

      return {
        accessToken: long.accessToken,
        refreshToken: undefined, // Meta doesn't issue refresh tokens for user tokens
        expiresAt: long.expiresAt,
        scopes: debug?.scopes ?? ["ads_management", "ads_read"],
        externalId: adAccountId,
        displayName,
      };
    },

    async execute(ctx, input) {
      const tokens = await loadTokens(ctx.orgId, Platform.META);
      if (!tokens?.plainAccessToken) {
        throw new Error("[META] no connected integration — OAuth first");
      }

      const client = new MetaClient({
        accessToken: tokens.plainAccessToken,
        onRateLimit: (usage) => {
          // Fire-and-forget telemetry — don't block the request.
          db.auditLog
            .create({
              data: {
                orgId: ctx.orgId,
                action: "meta.rate_limit",
                meta: { ...usage },
              },
            })
            .catch(() => null);
        },
      });

      const adAccountId = String(input.payload?.adAccountId ?? tokens.externalId ?? "");
      if (!adAccountId) throw new Error("[META] adAccountId required in payload");

      switch (input.action) {
        case "sync_metrics": {
          const rows = await client.getInsights(adAccountId, {
            level: "account",
            date_preset: "last_7d",
            fields: ["impressions", "clicks", "spend", "actions", "action_values"],
          });
          const summed = rows.reduce(
            (a, r) => ({
              impressions: a.impressions + Number(r.impressions ?? 0),
              clicks: a.clicks + Number(r.clicks ?? 0),
              spend: a.spend + Math.round(Number(r.spend ?? 0) * 100),
              conversions:
                a.conversions +
                (r.actions?.reduce(
                  (s, act) =>
                    act.action_type === "offsite_conversion" ||
                    act.action_type === "purchase"
                      ? s + Number(act.value ?? 0)
                      : s,
                  0,
                ) ?? 0),
              revenue:
                a.revenue +
                (r.action_values?.reduce(
                  (s, act) =>
                    act.action_type === "purchase" ? s + Math.round(Number(act.value ?? 0) * 100) : s,
                  0,
                ) ?? 0),
            }),
            { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 },
          );
          return { action: input.action, metrics: summed, log: [`[META] insights ${rows.length} rows`] };
        }

        case "launch": {
          const payload = input.payload ?? {};
          const objective = toMetaObjective(payload.objective);
          const campaign = await client.createCampaign(adAccountId, {
            name: String(payload.name ?? `EIAAW campaign ${Date.now()}`),
            objective,
            daily_budget: payload.dailyBudget as number | undefined,
            status: "PAUSED", // always PAUSED — operator reviews before activation
          });
          return {
            action: input.action,
            externalIds: { campaign: campaign.id },
            log: [`[META] created campaign ${campaign.id} (objective=${objective}, PAUSED)`],
          };
        }

        case "pause": {
          const campaignId = String(input.payload?.campaignId ?? "");
          if (!campaignId) throw new Error("[META] campaignId required to pause");
          await client.updateCampaignStatus(campaignId, "PAUSED");
          return { action: input.action, log: [`[META] paused ${campaignId}`] };
        }

        case "optimize": {
          // Optimization is a higher-level flow composed by ads-budget + ads-test.
          // This entrypoint is intentionally a no-op; platform agents receive
          // concrete instructions via payload (e.g. update daily_budget).
          const campaignId = String(input.payload?.campaignId ?? "");
          const dailyBudget = Number(input.payload?.dailyBudget ?? 0);
          if (!campaignId || !dailyBudget) {
            return { action: input.action, log: ["[META] optimize: no-op (missing campaignId or dailyBudget)"] };
          }
          await client.raw("POST", `/${campaignId}`, { body: { daily_budget: String(dailyBudget) } });
          return { action: input.action, log: [`[META] set daily_budget=${dailyBudget} on ${campaignId}`] };
        }

        default:
          return { action: input.action, log: [`[META] unknown action`] };
      }
    },
  };
}
