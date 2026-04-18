/**
 * Meta Marketing API — response shapes.
 *
 * Covers the subset used by EIAAW: ad accounts, campaigns, adsets, ads,
 * insights, CAPI events. Keep hand-typed — auto-generating from the
 * OpenAPI feed introduces breakage on every Graph version bump.
 *
 * Current Graph API version: v21.0 (2025 Q4 stable).
 * See https://developers.facebook.com/docs/graph-api/changelog for revs.
 */

export type MetaGraphVersion = "v21.0" | "v20.0";
export const DEFAULT_GRAPH_VERSION: MetaGraphVersion = "v21.0";

// ── OAuth ──────────────────────────────────────────────────────────

export type MetaTokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in?: number; // seconds; absent on long-lived tokens
};

export type MetaDebugToken = {
  data: {
    app_id: string;
    type: "USER" | "PAGE" | "SYSTEM_USER" | "APP";
    application: string;
    expires_at: number; // unix seconds, 0 = never
    is_valid: boolean;
    scopes: string[];
    user_id: string;
  };
};

// ── Ad Account ─────────────────────────────────────────────────────

export type MetaAdAccount = {
  id: string;              // "act_123"
  account_id: string;      // "123"
  name: string;
  account_status: number;  // 1=active, 2=disabled, 3=unsettled, 7=closed...
  currency: string;
  timezone_name: string;
  business?: { id: string; name: string };
};

// ── Campaign ───────────────────────────────────────────────────────

export type MetaCampaignObjective =
  | "OUTCOME_SALES"
  | "OUTCOME_LEADS"
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_AWARENESS"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_APP_PROMOTION";

export type MetaCampaignStatus = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";

export type MetaCampaign = {
  id: string;
  name: string;
  objective: MetaCampaignObjective;
  status: MetaCampaignStatus;
  effective_status?: string;
  daily_budget?: string;        // minor units, stringified
  lifetime_budget?: string;
  buying_type?: "AUCTION" | "RESERVED";
  special_ad_categories?: string[];
  created_time?: string;
  updated_time?: string;
};

export type MetaCampaignCreate = {
  name: string;
  objective: MetaCampaignObjective;
  status?: MetaCampaignStatus;
  daily_budget?: number;        // minor units; we serialize to string
  lifetime_budget?: number;
  special_ad_categories?: string[];
};

// ── Ad Set ─────────────────────────────────────────────────────────

export type MetaBillingEvent = "IMPRESSIONS" | "LINK_CLICKS" | "THRUPLAY" | "LEADS";
export type MetaOptimizationGoal =
  | "OFFSITE_CONVERSIONS"
  | "LINK_CLICKS"
  | "IMPRESSIONS"
  | "REACH"
  | "LEAD_GENERATION"
  | "APP_INSTALLS"
  | "THRUPLAY";

export type MetaAdSet = {
  id: string;
  name: string;
  campaign_id: string;
  status: MetaCampaignStatus;
  daily_budget?: string;
  lifetime_budget?: string;
  billing_event: MetaBillingEvent;
  optimization_goal: MetaOptimizationGoal;
  targeting?: MetaTargeting;
  start_time?: string;
  end_time?: string;
  bid_amount?: number;
};

export type MetaTargeting = {
  age_min?: number;
  age_max?: number;
  genders?: (1 | 2)[]; // 1=male, 2=female
  geo_locations?: {
    countries?: string[];
    cities?: { key: string; radius?: number; distance_unit?: "mile" | "kilometer" }[];
  };
  interests?: { id: string; name: string }[];
  custom_audiences?: { id: string }[];
  excluded_custom_audiences?: { id: string }[];
  publisher_platforms?: ("facebook" | "instagram" | "audience_network" | "messenger")[];
};

export type MetaAdSetCreate = Omit<MetaAdSet, "id" | "start_time" | "end_time"> & {
  start_time?: string;
  end_time?: string;
};

// ── Ad ─────────────────────────────────────────────────────────────

export type MetaAd = {
  id: string;
  name: string;
  adset_id: string;
  campaign_id: string;
  status: MetaCampaignStatus;
  creative: { id: string };
  effective_status?: string;
};

export type MetaAdCreative = {
  id?: string;
  name: string;
  object_story_spec?: {
    page_id: string;
    link_data?: {
      link: string;
      message?: string;
      name?: string;     // headline
      description?: string;
      call_to_action?: { type: string; value?: { link?: string } };
      image_hash?: string;
    };
    video_data?: { video_id: string; title?: string; message?: string };
  };
};

// ── Insights ───────────────────────────────────────────────────────

export type MetaInsightsParams = {
  level: "account" | "campaign" | "adset" | "ad";
  date_preset?:
    | "today" | "yesterday" | "last_3d" | "last_7d" | "last_14d"
    | "last_28d" | "last_30d" | "last_90d" | "this_month" | "last_month";
  time_range?: { since: string; until: string }; // YYYY-MM-DD
  fields?: string[];
  breakdowns?: string[];
  limit?: number;
};

export type MetaInsightsRow = {
  account_id?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  date_start: string;
  date_stop: string;
  impressions: string;        // Meta returns numbers as strings
  clicks: string;
  spend: string;
  reach?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  frequency?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
};

// ── Conversions API (CAPI) ─────────────────────────────────────────

export type MetaCapiEvent = {
  event_name:
    | "Purchase" | "AddToCart" | "Lead" | "CompleteRegistration"
    | "ViewContent" | "Search" | "InitiateCheckout" | "AddPaymentInfo"
    | "Subscribe" | "StartTrial";
  event_time: number;          // unix seconds
  event_id: string;             // REQUIRED — dedup against pixel event_id
  event_source_url?: string;
  action_source: "website" | "app" | "email" | "chat" | "phone_call" | "system_generated" | "physical_store";
  user_data: {
    em?: string[];   // sha256 hashed email(s)
    ph?: string[];   // sha256 hashed phone(s)
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;    // _fbc cookie
    fbp?: string;    // _fbp cookie
    external_id?: string[];
  };
  custom_data?: {
    currency?: string;
    value?: number;
    content_ids?: string[];
    content_type?: "product" | "product_group";
    order_id?: string;
  };
};

export type MetaCapiResponse = {
  events_received: number;
  messages: string[];
  fbtrace_id: string;
};

// ── Error envelope ─────────────────────────────────────────────────

export type MetaError = {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  is_transient?: boolean;
  fbtrace_id: string;
};

export type MetaErrorResponse = {
  error: MetaError;
};

// ── Paging ─────────────────────────────────────────────────────────

export type MetaPaged<T> = {
  data: T[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
    previous?: string;
  };
  summary?: Record<string, unknown>;
};
