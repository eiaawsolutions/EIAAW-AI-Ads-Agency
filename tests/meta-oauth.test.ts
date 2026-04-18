import { describe, it, expect } from "vitest";
import { MetaOAuthClient } from "@/integrations/meta";
import { makeMockFetch } from "./helpers/mock-fetch";

describe("MetaOAuthClient", () => {
  it("throws without credentials", () => {
    // @ts-expect-error intentionally missing fields
    expect(() => new MetaOAuthClient({})).toThrow();
  });

  it("builds the dialog URL with default scopes", () => {
    const client = new MetaOAuthClient({ appId: "APP", appSecret: "SECRET" });
    const url = client.authorizationUrl("https://app.eiaaw.ai/cb", "nonce");
    expect(url).toContain("client_id=APP");
    expect(url).toContain("redirect_uri=https%3A%2F%2Fapp.eiaaw.ai%2Fcb");
    expect(url).toContain("state=nonce");
    expect(decodeURIComponent(url)).toContain("scope=ads_management,ads_read,business_management");
    expect(url).toContain("response_type=code");
  });

  it("exchanges an OAuth code for a token", async () => {
    const { fetch, calls } = makeMockFetch([
      { body: { access_token: "short_t", token_type: "bearer", expires_in: 3600 } },
    ]);
    const client = new MetaOAuthClient({ appId: "APP", appSecret: "SECRET", fetchImpl: fetch });
    const res = await client.exchangeCode("code_123", "https://app.eiaaw.ai/cb");
    expect(res.accessToken).toBe("short_t");
    expect(res.expiresAt).toBeInstanceOf(Date);
    expect(calls[0].url).toContain("client_id=APP");
    expect(calls[0].url).toContain("client_secret=SECRET");
    expect(calls[0].url).toContain("code=code_123");
  });

  it("upgrades to long-lived token", async () => {
    const { fetch, calls } = makeMockFetch([
      { body: { access_token: "long_t", token_type: "bearer", expires_in: 5_184_000 } },
    ]);
    const client = new MetaOAuthClient({ appId: "APP", appSecret: "SECRET", fetchImpl: fetch });
    const res = await client.exchangeForLongLived("short_t");
    expect(res.accessToken).toBe("long_t");
    expect(calls[0].url).toContain("grant_type=fb_exchange_token");
    expect(calls[0].url).toContain("fb_exchange_token=short_t");
  });

  it("debug_token uses app access token in query", async () => {
    const { fetch, calls } = makeMockFetch([
      {
        body: {
          data: {
            app_id: "APP",
            type: "USER",
            application: "EIAAW",
            expires_at: 0,
            is_valid: true,
            scopes: ["ads_management"],
            user_id: "123",
          },
        },
      },
    ]);
    const client = new MetaOAuthClient({ appId: "APP", appSecret: "SECRET", fetchImpl: fetch });
    const res = await client.debugToken("some_token");
    expect(res.is_valid).toBe(true);
    expect(res.scopes).toContain("ads_management");
    expect(calls[0].url).toContain("access_token=APP%7CSECRET");
    expect(calls[0].url).toContain("input_token=some_token");
  });

  it("throws MetaApiError when Graph returns an error envelope", async () => {
    const { fetch } = makeMockFetch([
      {
        status: 400,
        body: { error: { message: "bad code", type: "OAuthException", code: 100, fbtrace_id: "x" } },
      },
    ]);
    const client = new MetaOAuthClient({ appId: "APP", appSecret: "SECRET", fetchImpl: fetch });
    await expect(client.exchangeCode("bad", "https://app.eiaaw.ai/cb")).rejects.toThrow(/bad code/);
  });
});
