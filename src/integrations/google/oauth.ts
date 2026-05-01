import type { Fetch } from "./client";
import { GoogleAdsApiError, tryParseGoogleAdsError } from "./errors";
import type { GoogleRefreshResponse, GoogleTokenInfo, GoogleTokenResponse } from "./types";

/**
 * Google OAuth 2.0 token lifecycle.
 *
 *   authorization code  ──exchangeCode──▶  access_token (1h) + refresh_token
 *                                                │
 *                                       refresh()─┘
 *                                                │
 *                                          new access_token (1h)
 *
 * Google only issues a refresh_token on the FIRST authorization for a given
 * (client_id, user) pair, and only when `prompt=consent&access_type=offline`
 * is set. Subsequent re-authorizations return access_token only — the
 * client must keep the original refresh_token. authorizationUrl() forces
 * `prompt=consent` so reconnects always yield a fresh refresh_token.
 */

export type OAuthExchangeResult = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope: string;
};

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  fetchImpl?: Fetch;
};

const AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_BASE = "https://oauth2.googleapis.com/token";
const TOKENINFO_BASE = "https://oauth2.googleapis.com/tokeninfo";

/** Default scope for Google Ads API access. */
export const ADWORDS_SCOPE = "https://www.googleapis.com/auth/adwords";

export class GoogleOAuthClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetchImpl: Fetch;

  constructor(cfg: GoogleOAuthConfig) {
    if (!cfg.clientId || !cfg.clientSecret) {
      throw new Error("GoogleOAuth: clientId and clientSecret required");
    }
    this.clientId = cfg.clientId;
    this.clientSecret = cfg.clientSecret;
    this.fetchImpl = cfg.fetchImpl ?? globalThis.fetch;
  }

  /**
   * Build the authorization URL.
   *
   *  - `access_type=offline` is REQUIRED to receive a refresh_token.
   *  - `prompt=consent` forces re-issuing the refresh_token even on
   *    re-authorization (otherwise Google omits it on subsequent grants
   *    for the same client/user pair).
   */
  authorizationUrl(redirectUri: string, state: string, scopes: string[] = [ADWORDS_SCOPE]): string {
    const url = new URL(AUTH_BASE);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    return url.toString();
  }

  /** Exchange an OAuth authorization code for access + refresh tokens. */
  async exchangeCode(code: string, redirectUri: string): Promise<OAuthExchangeResult> {
    const body = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const json = (await this.postForm(TOKEN_BASE, body)) as GoogleTokenResponse;
    return this.toResult(json);
  }

  /**
   * Refresh an access token using a stored refresh_token.
   * The refresh_token is reusable until the user revokes access.
   */
  async refresh(refreshToken: string): Promise<OAuthExchangeResult> {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
    });
    const json = (await this.postForm(TOKEN_BASE, body)) as GoogleRefreshResponse;
    return this.toResult({ ...json, refresh_token: refreshToken });
  }

  /** Inspect a token's validity, scopes, and expiry (used to extract scopes). */
  async tokenInfo(accessToken: string): Promise<GoogleTokenInfo> {
    const url = new URL(TOKENINFO_BASE);
    url.searchParams.set("access_token", accessToken);
    return (await this.getJson(url.toString())) as GoogleTokenInfo;
  }

  // ── internals ─────────────────────────────────────────────────────

  private async postForm(url: string, body: URLSearchParams): Promise<unknown> {
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    return this.parseResponse(res);
  }

  private async getJson(url: string): Promise<unknown> {
    const res = await this.fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return this.parseResponse(res);
  }

  private async parseResponse(res: Response): Promise<unknown> {
    const text = await res.text();
    let parsed: unknown = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }
    const apiErr = tryParseGoogleAdsError(parsed, res.status);
    if (apiErr) throw apiErr;
    if (!res.ok) {
      throw new GoogleAdsApiError(
        { code: res.status, message: `HTTP ${res.status}: ${text.slice(0, 200)}`, status: "UNKNOWN" },
        res.status,
      );
    }
    return parsed;
  }

  private toResult(t: GoogleTokenResponse | GoogleRefreshResponse): OAuthExchangeResult {
    if (!t.access_token) {
      throw new Error("Google OAuth: response missing access_token");
    }
    return {
      accessToken: t.access_token,
      refreshToken: "refresh_token" in t ? t.refresh_token : undefined,
      expiresAt: new Date(Date.now() + (t.expires_in ?? 3600) * 1000),
      scope: t.scope,
    };
  }
}
