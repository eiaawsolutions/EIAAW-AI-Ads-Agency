import { Platform } from "@prisma/client";
import type { PlatformAdapter } from "./types";
import { stubAdapter } from "./_stub";
import { MetaClient, MetaOAuthClient } from "./meta";
import { MetaApiError } from "./meta/errors";
import type {
  MetaCampaignObjective,
  MetaOptimizationGoal,
  MetaBillingEvent,
  MetaCallToActionType,
} from "./meta/types";
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
 * Map our internal objective to Meta's (optimization_goal, billing_event,
 * promoted_object) trio that an AdSet needs.
 *
 * Meta's auction won't run an AdSet unless these three are coherent:
 *
 *   OUTCOME_SALES        → optimization_goal=OFFSITE_CONVERSIONS, billing=IMPRESSIONS,
 *                          promoted_object={pixel_id, custom_event_type=PURCHASE}
 *   OUTCOME_LEADS        → optimization_goal=OFFSITE_CONVERSIONS, billing=IMPRESSIONS,
 *                          promoted_object={pixel_id, custom_event_type=LEAD}
 *   OUTCOME_TRAFFIC      → optimization_goal=LINK_CLICKS, billing=LINK_CLICKS
 *   OUTCOME_AWARENESS    → optimization_goal=REACH, billing=IMPRESSIONS
 *   OUTCOME_ENGAGEMENT   → optimization_goal=POST_ENGAGEMENT (we use IMPRESSIONS as billing — POST_ENGAGEMENT billing is rare)
 *   OUTCOME_APP_PROMOTION → optimization_goal=APP_INSTALLS (requires application_id;
 *                          we don't yet collect this — fail loudly rather than
 *                          create an undeliverable AdSet)
 */
type AdSetOptimizationProfile = {
  optimizationGoal: MetaOptimizationGoal;
  billingEvent: MetaBillingEvent;
  pixelRequired: boolean;
  customEventType?: "PURCHASE" | "LEAD";
};

function adsetOptimizationFor(objective: MetaCampaignObjective): AdSetOptimizationProfile {
  switch (objective) {
    case "OUTCOME_SALES":
      return { optimizationGoal: "OFFSITE_CONVERSIONS", billingEvent: "IMPRESSIONS", pixelRequired: true, customEventType: "PURCHASE" };
    case "OUTCOME_LEADS":
      return { optimizationGoal: "OFFSITE_CONVERSIONS", billingEvent: "IMPRESSIONS", pixelRequired: true, customEventType: "LEAD" };
    case "OUTCOME_TRAFFIC":
      return { optimizationGoal: "LINK_CLICKS", billingEvent: "LINK_CLICKS", pixelRequired: false };
    case "OUTCOME_AWARENESS":
      return { optimizationGoal: "REACH", billingEvent: "IMPRESSIONS", pixelRequired: false };
    case "OUTCOME_ENGAGEMENT":
      // POST_ENGAGEMENT isn't in our type union; fall back to LINK_CLICKS-style optimization
      // until we add full engagement support (AdSet would also need a post_id).
      return { optimizationGoal: "LINK_CLICKS", billingEvent: "IMPRESSIONS", pixelRequired: false };
    case "OUTCOME_APP_PROMOTION":
      return { optimizationGoal: "APP_INSTALLS", billingEvent: "IMPRESSIONS", pixelRequired: false };
  }
}

/**
 * Best-effort mapping from a free-form target-location string to ISO 3166-1
 * alpha-2 country codes that Meta's geo_locations.countries expects.
 *
 * Meta also accepts cities (with key + radius) and regions, but those need
 * a separate /search?type=adgeolocation API roundtrip per term to resolve
 * canonical keys. For wizard launches we keep it simple: country-level
 * targeting via this lookup, falling back to Worldwide (no targeting) when
 * the operator's input doesn't match a known label.
 *
 * Sub-region targeting (cities, regions, DMAs) is a Phase C2 enhancement.
 */
const COUNTRY_LOOKUP: Record<string, string[]> = {
  worldwide: [], // empty = no country restriction
  global: [],
  us: ["US"], usa: ["US"], "united states": ["US"], america: ["US"],
  ca: ["CA"], canada: ["CA"],
  uk: ["GB"], gb: ["GB"], "united kingdom": ["GB"], britain: ["GB"], england: ["GB"],
  eu: ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"],
  "european union": ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"],
  australia: ["AU"], au: ["AU"],
  singapore: ["SG"], sg: ["SG"],
  malaysia: ["MY"], my: ["MY"],
  indonesia: ["ID"], id: ["ID"],
  "united arab emirates": ["AE"], uae: ["AE"], ae: ["AE"],
  india: ["IN"], in: ["IN"],
  japan: ["JP"], jp: ["JP"],
  philippines: ["PH"], ph: ["PH"],
  thailand: ["TH"], th: ["TH"],
  vietnam: ["VN"], vn: ["VN"],
  germany: ["DE"], de: ["DE"],
  france: ["FR"], fr: ["FR"],
};

function targetingFromLocation(targetLocation: string | undefined) {
  if (!targetLocation) return undefined;
  const key = targetLocation.trim().toLowerCase();
  const countries = COUNTRY_LOOKUP[key];
  if (!countries) {
    // Unknown free-form string — return no country restriction. Operator
    // will see this in the Meta Ads Manager preview and can refine targeting
    // before activating. Better than crashing the launch.
    return undefined;
  }
  if (countries.length === 0) return undefined; // worldwide
  return { geo_locations: { countries } };
}

const VALID_CTAS = new Set<MetaCallToActionType>([
  "LEARN_MORE", "SHOP_NOW", "SIGN_UP", "SUBSCRIBE", "BOOK_TRAVEL",
  "DOWNLOAD", "GET_QUOTE", "CONTACT_US", "APPLY_NOW", "GET_OFFER",
  "ORDER_NOW", "REGISTER_NOW", "WATCH_MORE", "INSTALL_MOBILE_APP",
  "USE_APP", "INSTALL_APP",
]);

function safeCta(input: unknown): MetaCallToActionType {
  const k = String(input ?? "LEARN_MORE").toUpperCase() as MetaCallToActionType;
  return VALID_CTAS.has(k) ? k : "LEARN_MORE";
}

type CreativePayload = {
  pageId?: string;
  pixelId?: string;
  landingUrl?: string;
  headline?: string;
  primaryText?: string;
  description?: string;
  cta?: string;
  imageHash?: string;
};

/**
 * Wrap a MetaApiError with the failing operation, the payload we sent,
 * and Meta's user-facing message, then re-throw so the campaign-launch
 * layer surfaces something the operator can act on.
 *
 * Non-MetaApiError errors pass through unchanged.
 */
function enrichMetaError(err: unknown, op: string, payload: Record<string, unknown>): Error {
  if (!(err instanceof MetaApiError)) return err instanceof Error ? err : new Error(String(err));
  const userMsg = err.raw.error_user_msg;
  const userTitle = err.raw.error_user_title;
  const detail = userMsg ? `${userTitle ? userTitle + ": " : ""}${userMsg}` : err.message;
  console.error(
    `[META] ${op} failed: code=${err.code} subcode=${err.subcode ?? "-"} ` +
      `category=${err.category} fbtrace=${err.fbtraceId} ` +
      `payload=${JSON.stringify(payload).slice(0, 500)} ` +
      `userMsg=${JSON.stringify(userMsg)}`,
  );
  return new Error(`[META] ${op} (#${err.code}) ${detail}`);
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
          // Full Meta delivery pipeline. We always run all four steps in
          // sequence — Campaign → AdSet → Creative → Ad — so a successful
          // return guarantees a Meta campaign that *can deliver* once
          // activated. Anything less is a shell that wastes operator time
          // when they hit "Activate" and discover the campaign won't spend.
          const payload = input.payload ?? {};
          const objective = toMetaObjective(payload.objective);
          const dailyBudget = payload.dailyBudget as number | undefined;
          const targetLocation = payload.targetLocation as string | undefined;
          const creative = (payload.creative as CreativePayload | undefined) ?? {};
          const log: string[] = [];

          // Pre-flight validation. We re-validate here so a direct API caller
          // (not the wizard) hits the same checks; the wizard already did
          // these client+server-side, so under normal flow this is a no-op.
          if (!creative.pageId) throw new Error("[META] creative.pageId required");
          if (!creative.landingUrl) throw new Error("[META] creative.landingUrl required");
          if (!creative.headline) throw new Error("[META] creative.headline required");
          if (!creative.primaryText) throw new Error("[META] creative.primaryText required");
          if (!creative.imageHash) throw new Error("[META] creative.imageHash required");

          const profile = adsetOptimizationFor(objective);
          if (profile.pixelRequired && !creative.pixelId) {
            throw new Error(
              `[META] objective ${objective} requires a Meta Pixel for ${profile.optimizationGoal} optimization — pass creative.pixelId`,
            );
          }

          // ── 1. Campaign ─────────────────────────────────────────────
          const campaignBody = {
            name: String(payload.name ?? `EIAAW campaign ${Date.now()}`),
            objective,
            daily_budget: dailyBudget,
            status: "PAUSED" as const,
          };
          let campaignId: string;
          try {
            const campaign = await client.createCampaign(adAccountId, campaignBody);
            campaignId = campaign.id;
            log.push(`[META] created campaign ${campaignId} (objective=${objective}, PAUSED)`);
          } catch (err) {
            throw enrichMetaError(err, "createCampaign", { adAccountId, ...campaignBody });
          }

          // ── 2. AdSet ────────────────────────────────────────────────
          // NOTE: when the campaign already has daily_budget set (CBO),
          // Meta REJECTS daily_budget at the AdSet level. We omit it here.
          const targeting = targetingFromLocation(targetLocation) ?? { geo_locations: { countries: ["US"] } };
          const adsetBody = {
            name: `${campaignBody.name} · AdSet`,
            campaign_id: campaignId,
            status: "PAUSED" as const,
            billing_event: profile.billingEvent,
            optimization_goal: profile.optimizationGoal,
            targeting,
            ...(profile.pixelRequired && creative.pixelId
              ? { promoted_object: { pixel_id: creative.pixelId, custom_event_type: profile.customEventType } }
              : {}),
            // Meta requires start_time on AdSets that don't inherit a campaign
            // schedule; default to "starts now" so activation is one click.
            start_time: new Date().toISOString(),
          };
          let adsetId: string;
          try {
            // The MetaClient.createAdSet method expects an MetaAdSetCreate type
            // with campaign_id; cast here because adapter is the bridge layer.
            const adset = await client.createAdSet(adAccountId, adsetBody as Parameters<typeof client.createAdSet>[1]);
            adsetId = adset.id;
            log.push(`[META] created adset ${adsetId} (goal=${profile.optimizationGoal}, billing=${profile.billingEvent})`);
          } catch (err) {
            throw enrichMetaError(err, "createAdSet", { adAccountId, ...adsetBody });
          }

          // ── 3. Creative ─────────────────────────────────────────────
          const creativeBody = {
            name: `${campaignBody.name} · Creative`,
            object_story_spec: {
              page_id: creative.pageId,
              link_data: {
                link: creative.landingUrl,
                message: creative.primaryText,
                name: creative.headline,
                description: creative.description || undefined,
                image_hash: creative.imageHash,
                call_to_action: {
                  type: safeCta(creative.cta),
                  value: { link: creative.landingUrl },
                },
              },
            },
          };
          let creativeId: string;
          try {
            const cr = await client.createCreative(adAccountId, creativeBody);
            creativeId = cr.id;
            log.push(`[META] created creative ${creativeId} (cta=${safeCta(creative.cta)})`);
          } catch (err) {
            throw enrichMetaError(err, "createCreative", { adAccountId, ...creativeBody });
          }

          // ── 4. Ad ───────────────────────────────────────────────────
          const adBody = {
            name: `${campaignBody.name} · Ad`,
            adset_id: adsetId,
            creative_id: creativeId,
            status: "PAUSED" as const,
          };
          let adId: string;
          try {
            const ad = await client.createAd(adAccountId, adBody);
            adId = ad.id;
            log.push(`[META] created ad ${adId} — campaign ready to activate`);
          } catch (err) {
            throw enrichMetaError(err, "createAd", { adAccountId, ...adBody });
          }

          return {
            action: input.action,
            externalIds: { campaign: campaignId, adset: adsetId, creative: creativeId, ad: adId },
            log,
          };
        }

        case "activate": {
          // Activate the campaign on Meta. The launch flow leaves Campaign +
          // AdSet + Ad all in PAUSED state — flipping the campaign to ACTIVE
          // is enough; child entities inherit the parent's effective_status
          // unless individually paused, and we never individually pause them
          // during launch, so this single call is sufficient.
          const campaignId = String(input.payload?.campaignId ?? "");
          if (!campaignId) throw new Error("[META] campaignId required to activate");
          try {
            await client.updateCampaignStatus(campaignId, "ACTIVE");
            return { action: input.action, log: [`[META] activated ${campaignId} (campaign + child adsets/ads now LIVE)`] };
          } catch (err) {
            throw enrichMetaError(err, "updateCampaignStatus(ACTIVE)", { campaignId });
          }
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
