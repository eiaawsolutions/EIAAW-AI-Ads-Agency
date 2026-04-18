import type { Fetch } from "./client";
import { MetaApiError, tryParseMetaError } from "./errors";
import { DEFAULT_GRAPH_VERSION, type MetaDebugToken, type MetaTokenResponse, type MetaGraphVersion } from "./types";

/**
 * Meta OAuth token lifecycle.
 *
 *  short-lived (2h user token)  ──exchange──▶  long-lived (60d user token)
 *                                                       │
 *                                             (optional) System User token
 *                                                       │
 *                                              (never expires, stored encrypted)
 *
 * EIAAW prefers long-lived tokens. System User tokens are acquired via
 * Business Manager for server-side fleets — not part of the OAuth callback path.
 */

export type OAuthExchangeResult = {
  accessToken: string;
  tokenType: "bearer";
  expiresAt?: Date;
};

export type MetaOAuthConfig = {
  appId: string;
  appSecret: string;
  apiVersion?: MetaGraphVersion;
  fetchImpl?: Fetch;
};

export class MetaOAuthClient {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly apiVersion: MetaGraphVersion;
  private readonly fetchImpl: Fetch;
  private readonly baseUrl: string;

  constructor(cfg: MetaOAuthConfig) {
    if (!cfg.appId || !cfg.appSecret) {
      throw new Error("MetaOAuth: appId and appSecret required");
    }
    this.appId = cfg.appId;
    this.appSecret = cfg.appSecret;
    this.apiVersion = cfg.apiVersion ?? DEFAULT_GRAPH_VERSION;
    this.fetchImpl = cfg.fetchImpl ?? globalThis.fetch;
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Build the dialog URL to send the user to.
   * https://www.facebook.com/{version}/dialog/oauth?...
   */
  authorizationUrl(redirectUri: string, state: string, scopes: string[] = ["ads_management", "ads_read", "business_management"]): string {
    const url = new URL(`https://www.facebook.com/${this.apiVersion}/dialog/oauth`);
    url.searchParams.set("client_id", this.appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", scopes.join(","));
    url.searchParams.set("response_type", "code");
    return url.toString();
  }

  /** Exchange an OAuth authorization code for a short-lived user token. */
  async exchangeCode(code: string, redirectUri: string): Promise<OAuthExchangeResult> {
    const url = new URL(`${this.baseUrl}/oauth/access_token`);
    url.searchParams.set("client_id", this.appId);
    url.searchParams.set("client_secret", this.appSecret);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code", code);

    const body = await this.getJson(url.toString());
    return this.toResult(body);
  }

  /** Exchange a short-lived token for a ~60d long-lived token. */
  async exchangeForLongLived(shortLivedToken: string): Promise<OAuthExchangeResult> {
    const url = new URL(`${this.baseUrl}/oauth/access_token`);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", this.appId);
    url.searchParams.set("client_secret", this.appSecret);
    url.searchParams.set("fb_exchange_token", shortLivedToken);

    const body = await this.getJson(url.toString());
    return this.toResult(body);
  }

  /** Inspect a token's validity, scopes, and expiry. */
  async debugToken(token: string): Promise<MetaDebugToken["data"]> {
    const appAccessToken = `${this.appId}|${this.appSecret}`;
    const url = new URL(`${this.baseUrl}/debug_token`);
    url.searchParams.set("input_token", token);
    url.searchParams.set("access_token", appAccessToken);

    const body = (await this.getJson(url.toString())) as MetaDebugToken;
    return body.data;
  }

  // ── internals ─────────────────────────────────────────────────────

  private async getJson(url: string): Promise<unknown> {
    const res = await this.fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
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
    return body;
  }

  private toResult(body: unknown): OAuthExchangeResult {
    const r = body as MetaTokenResponse;
    if (!r.access_token) {
      throw new Error("Meta OAuth: response missing access_token");
    }
    return {
      accessToken: r.access_token,
      tokenType: r.token_type,
      expiresAt: r.expires_in ? new Date(Date.now() + r.expires_in * 1000) : undefined,
    };
  }
}
