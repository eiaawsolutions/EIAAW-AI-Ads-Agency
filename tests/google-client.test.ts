import { describe, it, expect } from "vitest";
import { GoogleAdsClient } from "@/integrations/google";
import { makeMockFetchGoogle } from "./helpers/mock-fetch-google";

const BASE_CFG = {
  accessToken: "ya29.tok",
  developerToken: "DEV-TOKEN",
};

describe("GoogleAdsClient", () => {
  it("requires accessToken + developerToken", () => {
    // @ts-expect-error
    expect(() => new GoogleAdsClient({})).toThrow();
    // @ts-expect-error
    expect(() => new GoogleAdsClient({ accessToken: "x" })).toThrow();
  });

  it("listAccessibleCustomers GETs and returns resourceNames", async () => {
    const { fetch, calls } = makeMockFetchGoogle([
      { body: { resourceNames: ["customers/1234567890", "customers/9876543210"] } },
    ]);
    const client = new GoogleAdsClient({ ...BASE_CFG, fetchImpl: fetch });
    const res = await client.listAccessibleCustomers();
    expect(res).toEqual(["customers/1234567890", "customers/9876543210"]);
    expect(calls[0].method).toBe("GET");
    expect(calls[0].url).toContain("/customers:listAccessibleCustomers");
    expect(calls[0].headers["authorization"]).toBe("Bearer ya29.tok");
    expect(calls[0].headers["developer-token"]).toBe("DEV-TOKEN");
  });

  it("includes login-customer-id header when configured (with dashes stripped)", async () => {
    const { fetch, calls } = makeMockFetchGoogle([{ body: { resourceNames: [] } }]);
    const client = new GoogleAdsClient({
      ...BASE_CFG,
      loginCustomerId: "398-206-7298",
      fetchImpl: fetch,
    });
    await client.listAccessibleCustomers();
    expect(calls[0].headers["login-customer-id"]).toBe("3982067298");
  });

  it("search posts GAQL body and unwraps results", async () => {
    const { fetch, calls } = makeMockFetchGoogle([
      {
        body: {
          results: [
            { customer: { id: "1234567890", descriptiveName: "EIAAW Demo Account" } },
          ],
        },
      },
    ]);
    const client = new GoogleAdsClient({ ...BASE_CFG, fetchImpl: fetch });
    const rows = await client.search("123-456-7890", "SELECT customer.id FROM customer LIMIT 1");
    expect(rows).toHaveLength(1);
    expect(rows[0].customer?.descriptiveName).toBe("EIAAW Demo Account");

    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toContain("/customers/1234567890/googleAds:search");
    const body = calls[0].body as { query: string; pageSize: number };
    expect(body.query).toContain("SELECT customer.id");
    expect(body.pageSize).toBe(1000);
  });

  it("search auto-paginates via nextPageToken", async () => {
    const { fetch, calls } = makeMockFetchGoogle([
      { body: { results: [{ customer: { id: "1" } }], nextPageToken: "PAGE2" } },
      { body: { results: [{ customer: { id: "2" } }] } },
    ]);
    const client = new GoogleAdsClient({ ...BASE_CFG, fetchImpl: fetch });
    const rows = await client.search("1234567890", "SELECT customer.id FROM customer");
    expect(rows.map((r) => r.customer?.id)).toEqual(["1", "2"]);
    expect((calls[1].body as { pageToken?: string }).pageToken).toBe("PAGE2");
  });

  it("searchStream flattens chunked array response", async () => {
    const { fetch, calls } = makeMockFetchGoogle([
      {
        body: [
          { results: [{ customer: { id: "1" } }, { customer: { id: "2" } }] },
          { results: [{ customer: { id: "3" } }] },
        ],
      },
    ]);
    const client = new GoogleAdsClient({ ...BASE_CFG, fetchImpl: fetch });
    const rows = await client.searchStream("1234567890", "SELECT customer.id FROM customer");
    expect(rows.map((r) => r.customer?.id)).toEqual(["1", "2", "3"]);
    expect(calls[0].url).toContain(":searchStream");
  });

  it("retries transient errors and eventually succeeds", async () => {
    const { fetch, calls } = makeMockFetchGoogle([
      {
        status: 503,
        body: {
          error: { code: 503, message: "Service Unavailable", status: "UNAVAILABLE" },
        },
      },
      { body: { resourceNames: ["customers/1"] } },
    ]);
    const client = new GoogleAdsClient({
      ...BASE_CFG,
      fetchImpl: fetch,
      backoffBaseMs: 1,
    });
    const res = await client.listAccessibleCustomers();
    expect(res).toEqual(["customers/1"]);
    expect(calls).toHaveLength(2); // retried once
  });

  it("does NOT retry non-retryable errors (4xx validation)", async () => {
    const { fetch, calls } = makeMockFetchGoogle([
      {
        status: 400,
        body: {
          error: { code: 400, message: "Bad GAQL", status: "INVALID_ARGUMENT" },
        },
      },
    ]);
    const client = new GoogleAdsClient({
      ...BASE_CFG,
      fetchImpl: fetch,
      backoffBaseMs: 1,
    });
    await expect(
      client.search("1234567890", "INVALID GAQL"),
    ).rejects.toMatchObject({ category: "validation" });
    expect(calls).toHaveLength(1);
  });
});
