import { MetaApiError, tryParseMetaError } from "./errors";
import {
  DEFAULT_GRAPH_VERSION,
  type MetaGraphVersion,
  type MetaAdAccount,
  type MetaCampaign,
  type MetaCampaignCreate,
  type MetaAdSet,
  type MetaAdSetCreate,
  type MetaAd,
  type MetaAdCreative,
  type MetaCapiEvent,
  type MetaCapiResponse,
  type MetaInsightsParams,
  type MetaInsightsRow,
  type MetaPaged,
  type MetaPage,
  type MetaPixel,
  type MetaImageUploadResponse,
} from "./types";

/**
 * Meta Marketing API client.
 *
 * Design tenets:
 *   1. `fetch` is injected → fully testable with a mockFetch harness
 *   2. Typed responses, not `any` — every Graph shape lives in ./types
 *   3. Errors are MetaApiError with a classification, never raw throws
 *   4. Retry is built-in for transient + rate_limit categories
 *   5. Rate-limit budget tracked per ad account via response headers
 */

export type Fetch = typeof fetch;

export type MetaClientConfig = {
  accessToken: string;
  apiVersion?: MetaGraphVersion;
  /** Override for tests. Defaults to global fetch. */
  fetchImpl?: Fetch;
  /** Max retries on transient/rate-limit errors. Default 3. */
  maxRetries?: number;
  /** Exponential backoff base (ms). Default 500. */
  backoffBaseMs?: number;
  /** Called when rate-limit headers are observed (telemetry hook). */
  onRateLimit?: (usage: RateLimitUsage) => void;
  /** Base URL override — set for tests / staging. */
  baseUrl?: string;
};

export type RateLimitUsage = {
  callCount: number;       // percent of call limit consumed
  totalCpuTime: number;     // percent of CPU budget consumed
  totalTime: number;        // percent of total time budget consumed
  estimatedTimeToRegainAccess: number; // minutes
};

export class MetaClient {
  readonly apiVersion: MetaGraphVersion;
  readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly fetchImpl: Fetch;
  private readonly maxRetries: number;
  private readonly backoffBaseMs: number;
  private readonly onRateLimit?: (u: RateLimitUsage) => void;

  constructor(cfg: MetaClientConfig) {
    if (!cfg.accessToken) throw new Error("MetaClient: accessToken required");
    this.accessToken = cfg.accessToken;
    this.apiVersion = cfg.apiVersion ?? DEFAULT_GRAPH_VERSION;
    this.baseUrl = cfg.baseUrl ?? `https://graph.facebook.com/${this.apiVersion}`;
    this.fetchImpl = cfg.fetchImpl ?? globalThis.fetch;
    this.maxRetries = cfg.maxRetries ?? 3;
    this.backoffBaseMs = cfg.backoffBaseMs ?? 500;
    this.onRateLimit = cfg.onRateLimit;
  }

  // ── Core transport ────────────────────────────────────────────────

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    opts: {
      query?: Record<string, string | number | boolean | undefined>;
      body?: Record<string, unknown>;
      attempt?: number;
    } = {},
  ): Promise<T> {
    const attempt = opts.attempt ?? 0;
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("access_token", this.accessToken);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = { method, headers: { Accept: "application/json" } };
    if (opts.body) {
      init.headers = { ...init.headers, "Content-Type": "application/json" };
      init.body = JSON.stringify(opts.body);
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url.toString(), init);
    } catch (networkErr) {
      if (attempt < this.maxRetries) {
        await this.backoff(attempt);
        return this.request<T>(method, path, { ...opts, attempt: attempt + 1 });
      }
      throw new MetaApiError(
        {
          message: networkErr instanceof Error ? networkErr.message : String(networkErr),
          type: "NetworkError",
          code: 2,
          is_transient: true,
          fbtrace_id: "",
        },
        0,
      );
    }

    this.parseRateLimitHeaders(res);

    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }

    const metaErr = tryParseMetaError(body, res.status);
    if (metaErr) {
      if (metaErr.retryable && attempt < this.maxRetries) {
        await this.backoff(attempt, metaErr);
        return this.request<T>(method, path, { ...opts, attempt: attempt + 1 });
      }
      throw metaErr;
    }

    if (!res.ok) {
      throw new MetaApiError(
        {
          message: `HTTP ${res.status}`,
          type: "HttpError",
          code: res.status,
          is_transient: res.status >= 500,
          fbtrace_id: "",
        },
        res.status,
      );
    }

    return body as T;
  }

  private async backoff(attempt: number, err?: MetaApiError) {
    // Rate-limit errors: longer wait; others: exponential.
    const base = err?.category === "rate_limit" ? 5000 : this.backoffBaseMs;
    const ms = base * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
    await new Promise((r) => setTimeout(r, ms));
  }

  private parseRateLimitHeaders(res: Response) {
    const hdr = res.headers.get("x-business-use-case-usage") ?? res.headers.get("x-ad-account-usage");
    if (!hdr || !this.onRateLimit) return;
    try {
      const parsed = JSON.parse(hdr) as Record<
        string,
        {
          call_count: number;
          total_cputime: number;
          total_time: number;
          estimated_time_to_regain_access: number;
        }[]
      >;
      for (const bucket of Object.values(parsed)) {
        for (const entry of bucket) {
          this.onRateLimit?.({
            callCount: entry.call_count,
            totalCpuTime: entry.total_cputime,
            totalTime: entry.total_time,
            estimatedTimeToRegainAccess: entry.estimated_time_to_regain_access,
          });
        }
      }
    } catch {
      // silently ignore — header shape occasionally drifts
    }
  }

  // ── Me / Ad Accounts ──────────────────────────────────────────────

  async me(): Promise<{ id: string; name: string }> {
    return this.request<{ id: string; name: string }>("GET", "/me");
  }

  async listAdAccounts(limit = 50): Promise<MetaAdAccount[]> {
    const res = await this.request<MetaPaged<MetaAdAccount>>("GET", "/me/adaccounts", {
      query: {
        fields: "id,account_id,name,account_status,currency,timezone_name,business",
        limit,
      },
    });
    return res.data;
  }

  // ── Pages ─────────────────────────────────────────────────────────
  // Required for ad creatives (object_story_spec.page_id). The user must
  // have granted pages_show_list during OAuth — without that scope this
  // returns []. We additionally filter to pages where the user has the
  // ADVERTISE task; only those can run paid ads through our app.

  async listPages(limit = 100): Promise<MetaPage[]> {
    const res = await this.request<MetaPaged<MetaPage>>("GET", "/me/accounts", {
      query: {
        fields: "id,name,category,tasks",
        limit,
      },
    });
    // Prefer pages where the user holds the ADVERTISE task — those are the
    // ones we know the user can run ads from. But if NO page has tasks
    // populated (older app permission tiers, business-manager-managed pages,
    // pages that came in via assigned roles instead of ownership), Meta
    // sometimes returns tasks=[] or omits the field entirely. In that case
    // the strict filter wipes the picker to empty and the operator hits a
    // dead end. Fall back to "show everything" — if the operator picks a
    // page they don't actually have rights on, createCreative returns
    // (#200) with a clear user_msg and the wizard surfaces that instead.
    const hasAdvertise = res.data.filter((p) => p.tasks?.includes("ADVERTISE"));
    if (hasAdvertise.length > 0) return hasAdvertise;
    return res.data;
  }

  // ── Pixels ────────────────────────────────────────────────────────
  // Required for OUTCOME_SALES / conversion-optimized AdSets. Without a
  // pixel + custom_event_type, OUTCOME_SALES has nothing to optimize
  // against and Meta either rejects or silently degrades to LINK_CLICKS.

  async listPixels(adAccountId: string, limit = 50): Promise<MetaPixel[]> {
    const id = this.qualifiedAccountId(adAccountId);
    const res = await this.request<MetaPaged<MetaPixel>>("GET", `/${id}/adspixels`, {
      query: {
        fields: "id,name,code,last_fired_time,is_unavailable",
        limit,
      },
    });
    return res.data.filter((p) => !p.is_unavailable);
  }

  /**
   * Create a fresh Meta Pixel on the given ad account.
   *
   * Returns the new Pixel id. The operator then needs to install the
   * 1-line snippet `fbq('init', '<id>')` on their site to start receiving
   * events — but the Pixel can be referenced as a promoted_object on an
   * AdSet immediately, even before any event has fired. Meta will simply
   * have nothing to optimize against until events arrive.
   */
  async createPixel(adAccountId: string, name: string): Promise<{ id: string }> {
    const id = this.qualifiedAccountId(adAccountId);
    return this.request<{ id: string }>("POST", `/${id}/adspixels`, { body: { name } });
  }

  // ── Image upload ──────────────────────────────────────────────────
  // POST /act_X/adimages with multipart/form-data — returns image_hash
  // which is what creative.object_story_spec.link_data.image_hash refers
  // to. We do NOT route this through `request()` because that helper
  // forces JSON content-type + body serialization.

  async uploadImage(adAccountId: string, file: { bytes: Uint8Array; filename: string }): Promise<{ hash: string; url: string }> {
    const id = this.qualifiedAccountId(adAccountId);
    const url = new URL(`${this.baseUrl}/${id}/adimages`);
    url.searchParams.set("access_token", this.accessToken);

    // Meta treats the "filename" as the key in the response.images map.
    // Sanitize it so we can index reliably (no spaces / special chars).
    const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, "_");

    const form = new FormData();
    // Detect content-type by file extension. Meta accepts JPEG/PNG/GIF
    // for ad creatives; non-supported formats return (#100) Invalid file.
    const ext = safeName.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "gif"
          ? "image/gif"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
    form.append("source", new Blob([file.bytes as BlobPart], { type: contentType }), safeName);

    const res = await this.fetchImpl(url.toString(), { method: "POST", body: form });
    const text = await res.text();
    let body: unknown = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }
    const metaErr = tryParseMetaError(body, res.status);
    if (metaErr) throw metaErr;
    if (!res.ok) {
      throw new MetaApiError(
        { message: `HTTP ${res.status}`, type: "HttpError", code: res.status, fbtrace_id: "" },
        res.status,
      );
    }
    const parsed = body as MetaImageUploadResponse;
    const entry = parsed.images?.[safeName];
    if (!entry?.hash) {
      throw new Error(`[META] uploadImage: response missing images['${safeName}'].hash — got ${JSON.stringify(parsed).slice(0, 200)}`);
    }
    return { hash: entry.hash, url: entry.url };
  }

  // ── Campaigns ─────────────────────────────────────────────────────

  async listCampaigns(adAccountId: string, limit = 100): Promise<MetaCampaign[]> {
    const id = this.qualifiedAccountId(adAccountId);
    const res = await this.request<MetaPaged<MetaCampaign>>("GET", `/${id}/campaigns`, {
      query: {
        fields: "id,name,objective,status,effective_status,daily_budget,lifetime_budget,buying_type,created_time,updated_time",
        limit,
      },
    });
    return res.data;
  }

  async createCampaign(adAccountId: string, input: MetaCampaignCreate): Promise<{ id: string }> {
    const id = this.qualifiedAccountId(adAccountId);
    return this.request<{ id: string }>("POST", `/${id}/campaigns`, {
      body: {
        ...input,
        status: input.status ?? "PAUSED", // safety: never auto-publish
        daily_budget: input.daily_budget !== undefined ? String(input.daily_budget) : undefined,
        lifetime_budget: input.lifetime_budget !== undefined ? String(input.lifetime_budget) : undefined,
        special_ad_categories: input.special_ad_categories ?? [],
      },
    });
  }

  async updateCampaignStatus(campaignId: string, status: "ACTIVE" | "PAUSED" | "ARCHIVED"): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("POST", `/${campaignId}`, { body: { status } });
  }

  // ── Ad Sets ───────────────────────────────────────────────────────

  async createAdSet(adAccountId: string, input: MetaAdSetCreate): Promise<{ id: string }> {
    const id = this.qualifiedAccountId(adAccountId);
    return this.request<{ id: string }>("POST", `/${id}/adsets`, {
      body: {
        ...input,
        status: input.status ?? "PAUSED",
        daily_budget: input.daily_budget !== undefined ? String(input.daily_budget) : undefined,
        lifetime_budget: input.lifetime_budget !== undefined ? String(input.lifetime_budget) : undefined,
      },
    });
  }

  async listAdSets(campaignId: string, limit = 100): Promise<MetaAdSet[]> {
    const res = await this.request<MetaPaged<MetaAdSet>>("GET", `/${campaignId}/adsets`, {
      query: {
        fields: "id,name,campaign_id,status,daily_budget,lifetime_budget,billing_event,optimization_goal,targeting,start_time,end_time,bid_amount",
        limit,
      },
    });
    return res.data;
  }

  // ── Ads + Creatives ───────────────────────────────────────────────

  async createCreative(adAccountId: string, creative: MetaAdCreative): Promise<{ id: string }> {
    const id = this.qualifiedAccountId(adAccountId);
    return this.request<{ id: string }>("POST", `/${id}/adcreatives`, { body: creative });
  }

  async createAd(adAccountId: string, input: { name: string; adset_id: string; creative_id: string; status?: "ACTIVE" | "PAUSED" }): Promise<{ id: string }> {
    const id = this.qualifiedAccountId(adAccountId);
    return this.request<{ id: string }>("POST", `/${id}/ads`, {
      body: {
        name: input.name,
        adset_id: input.adset_id,
        creative: { creative_id: input.creative_id },
        status: input.status ?? "PAUSED",
      },
    });
  }

  async listAds(adSetId: string, limit = 100): Promise<MetaAd[]> {
    const res = await this.request<MetaPaged<MetaAd>>("GET", `/${adSetId}/ads`, {
      query: {
        fields: "id,name,adset_id,campaign_id,status,effective_status,creative",
        limit,
      },
    });
    return res.data;
  }

  // ── Insights ──────────────────────────────────────────────────────

  async getInsights(entityId: string, params: MetaInsightsParams): Promise<MetaInsightsRow[]> {
    const query: Record<string, string | number | boolean | undefined> = {
      level: params.level,
      limit: params.limit ?? 500,
    };
    if (params.date_preset) query.date_preset = params.date_preset;
    if (params.time_range) query.time_range = JSON.stringify(params.time_range);
    if (params.fields) query.fields = params.fields.join(",");
    if (params.breakdowns) query.breakdowns = params.breakdowns.join(",");
    const res = await this.request<MetaPaged<MetaInsightsRow>>("GET", `/${entityId}/insights`, { query });
    return res.data;
  }

  // ── Conversions API (server-side events) ─────────────────────────

  async sendCapiEvents(pixelId: string, events: MetaCapiEvent[], testEventCode?: string): Promise<MetaCapiResponse> {
    return this.request<MetaCapiResponse>("POST", `/${pixelId}/events`, {
      body: { data: events, ...(testEventCode ? { test_event_code: testEventCode } : {}) },
    });
  }

  // ── Escape hatch for edge endpoints not yet modeled ───────────────

  async raw<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    opts: {
      query?: Record<string, string | number | boolean | undefined>;
      body?: Record<string, unknown>;
    } = {},
  ): Promise<T> {
    return this.request<T>(method, path, opts);
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private qualifiedAccountId(id: string): string {
    return id.startsWith("act_") ? id : `act_${id}`;
  }
}
