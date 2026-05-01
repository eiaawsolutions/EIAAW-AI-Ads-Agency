import { describe, it, expect } from "vitest";
import { GoogleOAuthClient, ADWORDS_SCOPE } from "@/integrations/google";
import { makeMockFetchGoogle } from "./helpers/mock-fetch-google";

describe("GoogleOAuthClient", () => {
  it("throws without credentials", () => {
    // @ts-expect-error intentionally missing fields
    expect(() => new GoogleOAuthClient({})).toThrow();
  });

  it("builds the authorization URL with default scope and offline+consent", () => {
    const client = new GoogleOAuthClient({ clientId: "CID", clientSecret: "SECRET" });
    const url = client.authorizationUrl("https://app.eiaaw.ai/cb", "nonce");
    expect(url).toContain("client_id=CID");
    expect(url).toContain("redirect_uri=https%3A%2F%2Fapp.eiaaw.ai%2Fcb");
    expect(url).toContain("state=nonce");
    expect(url).toContain("response_type=code");
    expect(url).toContain("access_type=offline");
    expect(url).toContain("prompt=consent");
    expect(decodeURIComponent(url)).toContain(`scope=${ADWORDS_SCOPE}`);
    expect(url).toContain("include_granted_scopes=true");
  });

  it("exchanges an authorization code for tokens", async () => {
    const { fetch, calls } = makeMockFetchGoogle([
      {
        body: {
          access_token: "ya29.access",
          refresh_token: "1//refresh",
          expires_in: 3600,
          scope: ADWORDS_SCOPE,
          token_type: "Bearer",
        },
      },
    ]);
    const client = new GoogleOAuthClient({
      clientId: "CID",
      clientSecret: "SECRET",
      fetchImpl: fetch,
    });
    const res = await client.exchangeCode("auth_code", "https://app.eiaaw.ai/cb");
    expect(res.accessToken).toBe("ya29.access");
    expect(res.refreshToken).toBe("1//refresh");
    expect(res.expiresAt).toBeInstanceOf(Date);
    expect(res.scope).toBe(ADWORDS_SCOPE);

    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toBe("https://oauth2.googleapis.com/token");
    // Body is form-urlencoded — captured raw by the mock.
    const formStr = String(calls[0].body);
    expect(formStr).toContain("grant_type=authorization_code");
    expect(formStr).toContain("code=auth_code");
    expect(formStr).toContain("client_id=CID");
    expect(formStr).toContain("client_secret=SECRET");
  });

  it("refresh keeps the original refresh_token when Google omits it", async () => {
    const { fetch, calls } = makeMockFetchGoogle([
      {
        body: {
          access_token: "ya29.refreshed",
          expires_in: 3600,
          scope: ADWORDS_SCOPE,
          token_type: "Bearer",
        },
      },
    ]);
    const client = new GoogleOAuthClient({
      clientId: "CID",
      clientSecret: "SECRET",
      fetchImpl: fetch,
    });
    const res = await client.refresh("1//original_refresh");
    expect(res.accessToken).toBe("ya29.refreshed");
    expect(res.refreshToken).toBe("1//original_refresh"); // preserved

    const formStr = String(calls[0].body);
    expect(formStr).toContain("grant_type=refresh_token");
    expect(formStr).toContain("refresh_token=1%2F%2Foriginal_refresh");
  });

  it("tokenInfo passes access_token in query", async () => {
    const { fetch, calls } = makeMockFetchGoogle([
      {
        body: {
          aud: "CID.apps.googleusercontent.com",
          scope: ADWORDS_SCOPE,
          exp: "1700000000",
          expires_in: "3500",
          access_type: "offline",
        },
      },
    ]);
    const client = new GoogleOAuthClient({
      clientId: "CID",
      clientSecret: "SECRET",
      fetchImpl: fetch,
    });
    const info = await client.tokenInfo("ya29.tok");
    expect(info.scope).toBe(ADWORDS_SCOPE);
    expect(calls[0].method).toBe("GET");
    expect(calls[0].url).toContain("https://oauth2.googleapis.com/tokeninfo");
    expect(calls[0].url).toContain("access_token=ya29.tok");
  });

  it("surfaces a Google API error envelope as GoogleAdsApiError", async () => {
    const { fetch } = makeMockFetchGoogle([
      {
        status: 400,
        body: {
          error: {
            code: 400,
            message: "Bad Request",
            status: "INVALID_ARGUMENT",
          },
        },
      },
    ]);
    const client = new GoogleOAuthClient({
      clientId: "CID",
      clientSecret: "SECRET",
      fetchImpl: fetch,
    });
    await expect(client.exchangeCode("bad_code", "https://app.eiaaw.ai/cb")).rejects.toMatchObject({
      name: "GoogleAdsApiError",
      category: "validation",
      status: "INVALID_ARGUMENT",
    });
  });
});
