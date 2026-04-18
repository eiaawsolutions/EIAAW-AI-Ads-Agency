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
