import { GoogleAdsApiError, tryParseGoogleAdsError } from "./errors";
import type {
  DEFAULT_API_VERSION as DefaultVersion,
  GoogleAdsApiVersion,
  ListAccessibleCustomersResponse,
  SearchResponse,
  SearchRow,
  SearchStreamChunk,
} from "./types";
import { DEFAULT_API_VERSION } from "./types";

/**
 * Google Ads API REST client.
 *
 * Mirrors the design tenets of MetaClient:
 *   1. `fetch` is injected → fully testable with a mockFetch harness
 *   2. Typed responses, not `any` — every shape lives in ./types
 *   3. Errors are GoogleAdsApiError with classification, never raw throws
 *   4. Retry built-in for transient + rate_limit categories
 *   5. Bearer access_token + developer-token + login-customer-id headers
 *
 * Key differences from Meta:
 *  - Every read goes through GAQL (Google Ads Query Language), not REST
 *    paths-per-resource. POST to `:search` or `:searchStream` with `query`.
 *  - Manager (MCC) auth requires the `login-customer-id` header set to the
 *    MCC's 10-digit ID. Without it, queries scoped to a non-managed
 *    customer return PERMISSION_DENIED.
 *  - Money in API is `costMicros` (1 unit = 1_000_000 micros). Convert
 *    in the call sites that persist (insights.ts).
 */

export type Fetch = typeof fetch;

export type GoogleAdsClientConfig = {
  /** OAuth 2.0 access token for the authorized user. */
  accessToken: string;
  /** Developer token issued to the MCC (Infisical-resolved). */
  developerToken: string;
  /**
   * MCC customer ID used as `login-customer-id` header when querying a
   * managed customer. Optional for direct (non-managed) customer queries.
   * Pass digits-only (no dashes).
   */
  loginCustomerId?: string;
  /** API version override; defaults to v18. */
  apiVersion?: GoogleAdsApiVersion;
  /** Override for tests. Defaults to global fetch. */
  fetchImpl?: Fetch;
  /** Max retries on transient/rate-limit errors. Default 3. */
  maxRetries?: number;
  /** Exponential backoff base (ms). Default 500. */
  backoffBaseMs?: number;
  /** Base URL override — set for tests / staging. */
  baseUrl?: string;
};

export class GoogleAdsClient {
  readonly apiVersion: GoogleAdsApiVersion;
  readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly developerToken: string;
  private readonly loginCustomerId?: string;
  private readonly fetchImpl: Fetch;
  private readonly maxRetries: number;
  private readonly backoffBaseMs: number;

  constructor(cfg: GoogleAdsClientConfig) {
    if (!cfg.accessToken) throw new Error("GoogleAdsClient: accessToken required");
    if (!cfg.developerToken) throw new Error("GoogleAdsClient: developerToken required");
    this.accessToken = cfg.accessToken;
    this.developerToken = cfg.developerToken;
    this.loginCustomerId = cfg.loginCustomerId ? stripDashes(cfg.loginCustomerId) : undefined;
    this.apiVersion = cfg.apiVersion ?? DEFAULT_API_VERSION;
    this.baseUrl = cfg.baseUrl ?? `https://googleads.googleapis.com/${this.apiVersion}`;
    this.fetchImpl = cfg.fetchImpl ?? globalThis.fetch;
    this.maxRetries = cfg.maxRetries ?? 3;
    this.backoffBaseMs = cfg.backoffBaseMs ?? 500;
  }

  // ── High-level helpers ────────────────────────────────────────────

  /**
   * Returns resource names of customers the user can access directly.
   * Used after OAuth to discover which customer ID(s) to attach.
   * Endpoint: `customers:listAccessibleCustomers`
   */
  async listAccessibleCustomers(): Promise<string[]> {
    const res = await this.request<ListAccessibleCustomersResponse>(
      "GET",
      "/customers:listAccessibleCustomers",
    );
    return res.resourceNames ?? [];
  }

  /**
   * Run a GAQL query under a specific customer. Auto-paginates.
   * `customerId` may include or omit dashes.
   */
  async search<T = SearchRow>(
    customerId: string,
    query: string,
    opts: { pageSize?: number } = {},
  ): Promise<T[]> {
    const cid = stripDashes(customerId);
    const all: T[] = [];
    let pageToken: string | undefined;
    do {
      const res = await this.request<SearchResponse<T>>(
        "POST",
        `/customers/${cid}/googleAds:search`,
        {
          body: {
            query,
            pageSize: opts.pageSize ?? 1000,
            ...(pageToken ? { pageToken } : {}),
          },
        },
      );
      if (res.results) all.push(...res.results);
      pageToken = res.nextPageToken;
    } while (pageToken);
    return all;
  }

  /**
   * Run a GAQL query in streaming mode. The REST endpoint returns a JSON
   * array of chunks; each chunk has its own `results`. We flatten.
   * Used for large date-range pulls where pagination would multiply RTTs.
   */
  async searchStream<T = SearchRow>(customerId: string, query: string): Promise<T[]> {
    const cid = stripDashes(customerId);
    const chunks = await this.request<SearchStreamChunk<T>[]>(
      "POST",
      `/customers/${cid}/googleAds:searchStream`,
      { body: { query } },
    );
    const all: T[] = [];
    for (const chunk of chunks ?? []) {
      if (chunk.results) all.push(...chunk.results);
    }
    return all;
  }

  // ── Core transport ────────────────────────────────────────────────

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    opts: { body?: Record<string, unknown>; attempt?: number } = {},
  ): Promise<T> {
    const attempt = opts.attempt ?? 0;
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.accessToken}`,
      "developer-token": this.developerToken,
    };
    if (this.loginCustomerId) {
      headers["login-customer-id"] = this.loginCustomerId;
    }
    if (opts.body) {
      headers["Content-Type"] = "application/json";
    }

    const init: RequestInit = {
      method,
      headers,
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    };

    let res: Response;
    try {
      res = await this.fetchImpl(url, init);
    } catch (networkErr) {
      if (attempt < this.maxRetries) {
        await this.backoff(attempt);
        return this.request<T>(method, path, { ...opts, attempt: attempt + 1 });
      }
      throw new GoogleAdsApiError(
        {
          code: 0,
          status: "UNAVAILABLE",
          message: networkErr instanceof Error ? networkErr.message : String(networkErr),
        },
        0,
      );
    }

    const text = await res.text();
    let body: unknown = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }

    const apiErr = tryParseGoogleAdsError(body, res.status);
    if (apiErr) {
      if (apiErr.retryable && attempt < this.maxRetries) {
        await this.backoff(attempt);
        return this.request<T>(method, path, { ...opts, attempt: attempt + 1 });
      }
      throw apiErr;
    }

    if (!res.ok) {
      throw new GoogleAdsApiError(
        { code: res.status, message: `HTTP ${res.status}: ${text.slice(0, 200)}`, status: "UNKNOWN" },
        res.status,
      );
    }

    return body as T;
  }

  private async backoff(attempt: number): Promise<void> {
    const ms = this.backoffBaseMs * Math.pow(2, attempt) + Math.random() * 100;
    await new Promise((r) => setTimeout(r, ms));
  }
}

/** Normalize "123-456-7890" → "1234567890". Customer IDs in API calls are unhyphenated. */
function stripDashes(id: string): string {
  return id.replace(/-/g, "");
}

// Re-export so callers can inspect the version ceiling without importing types.
export { DEFAULT_API_VERSION };
export type { DefaultVersion };
