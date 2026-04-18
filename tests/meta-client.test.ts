import { describe, it, expect } from "vitest";
import { MetaClient } from "@/integrations/meta";
import { makeMockFetch } from "./helpers/mock-fetch";

const token = "EAAG_mock_token";

describe("MetaClient — HTTP transport", () => {
  it("appends access_token to every request", async () => {
    const { fetch, calls } = makeMockFetch([{ body: { id: "123", name: "Test" } }]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch });
    await client.me();
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("access_token=EAAG_mock_token");
    expect(calls[0].method).toBe("GET");
  });

  it("serializes JSON body for POST", async () => {
    const { fetch, calls } = makeMockFetch([{ body: { id: "cmp_42" } }]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch });
    await client.createCampaign("act_999", { name: "Test", objective: "OUTCOME_SALES", daily_budget: 500 });
    const call = calls[0];
    expect(call.method).toBe("POST");
    expect(call.headers["content-type"]).toBe("application/json");
    // daily_budget is stringified per Meta's numeric-as-string convention
    expect((call.body as { daily_budget: string }).daily_budget).toBe("500");
  });

  it("auto-prefixes ad account id with act_", async () => {
    const { fetch, calls } = makeMockFetch([{ body: { data: [] } }]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch });
    await client.listCampaigns("123");
    expect(calls[0].url).toContain("/act_123/campaigns");
  });

  it("doesn't double-prefix already-qualified ids", async () => {
    const { fetch, calls } = makeMockFetch([{ body: { data: [] } }]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch });
    await client.listCampaigns("act_123");
    expect(calls[0].url).toContain("/act_123/campaigns");
    expect(calls[0].url).not.toContain("act_act_");
  });

  it("throws if accessToken is empty", () => {
    expect(() => new MetaClient({ accessToken: "" })).toThrow();
  });
});

describe("MetaClient — campaign creation safety", () => {
  it("forces status PAUSED by default (never auto-publish)", async () => {
    const { fetch, calls } = makeMockFetch([{ body: { id: "cmp_x" } }]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch });
    await client.createCampaign("act_1", { name: "X", objective: "OUTCOME_SALES" });
    expect((calls[0].body as { status: string }).status).toBe("PAUSED");
  });

  it("respects explicit ACTIVE when the caller opts in", async () => {
    const { fetch, calls } = makeMockFetch([{ body: { id: "cmp_x" } }]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch });
    await client.createCampaign("act_1", { name: "X", objective: "OUTCOME_SALES", status: "ACTIVE" });
    expect((calls[0].body as { status: string }).status).toBe("ACTIVE");
  });

  it("defaults special_ad_categories to []", async () => {
    const { fetch, calls } = makeMockFetch([{ body: { id: "cmp_x" } }]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch });
    await client.createCampaign("act_1", { name: "X", objective: "OUTCOME_SALES" });
    expect((calls[0].body as { special_ad_categories: unknown[] }).special_ad_categories).toEqual([]);
  });
});

describe("MetaClient — insights", () => {
  it("serializes time_range as JSON string", async () => {
    const { fetch, calls } = makeMockFetch([{ body: { data: [] } }]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch });
    await client.getInsights("act_1", {
      level: "account",
      time_range: { since: "2026-04-01", until: "2026-04-17" },
    });
    const url = calls[0].url;
    expect(url).toContain("level=account");
    expect(decodeURIComponent(url)).toContain('"since":"2026-04-01"');
  });

  it("joins fields with comma", async () => {
    const { fetch, calls } = makeMockFetch([{ body: { data: [] } }]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch });
    await client.getInsights("act_1", { level: "account", fields: ["impressions", "clicks", "spend"] });
    expect(decodeURIComponent(calls[0].url)).toContain("fields=impressions,clicks,spend");
  });
});

describe("MetaClient — retry behavior", () => {
  it("retries transient errors up to maxRetries", async () => {
    const { fetch, calls } = makeMockFetch([
      { status: 500, body: { error: { message: "glitch", type: "ServerError", code: 2, is_transient: true, fbtrace_id: "abc" } } },
      { status: 500, body: { error: { message: "glitch", type: "ServerError", code: 2, is_transient: true, fbtrace_id: "abc" } } },
      { body: { id: "ok" } },
    ]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch, maxRetries: 3, backoffBaseMs: 1 });
    const res = await client.me();
    expect(res).toEqual({ id: "ok" });
    expect(calls).toHaveLength(3);
  });

  it("gives up after maxRetries and throws", async () => {
    const { fetch } = makeMockFetch([
      { status: 500, body: { error: { message: "g", type: "E", code: 2, is_transient: true, fbtrace_id: "x" } } },
      { status: 500, body: { error: { message: "g", type: "E", code: 2, is_transient: true, fbtrace_id: "x" } } },
    ]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch, maxRetries: 1, backoffBaseMs: 1 });
    await expect(client.me()).rejects.toThrow();
  });

  it("does not retry auth errors (code 190)", async () => {
    const { fetch, calls } = makeMockFetch([
      { status: 401, body: { error: { message: "invalid token", type: "OAuthException", code: 190, fbtrace_id: "x" } } },
    ]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch, maxRetries: 3, backoffBaseMs: 1 });
    await expect(client.me()).rejects.toThrow(/invalid token/);
    expect(calls).toHaveLength(1); // no retry
  });

  it("does not retry validation errors (code 100)", async () => {
    const { fetch, calls } = makeMockFetch([
      { status: 400, body: { error: { message: "bad param", type: "GraphMethodException", code: 100, fbtrace_id: "x" } } },
    ]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch, maxRetries: 3, backoffBaseMs: 1 });
    await expect(client.me()).rejects.toThrow(/bad param/);
    expect(calls).toHaveLength(1);
  });
});

describe("MetaClient — rate-limit telemetry", () => {
  it("invokes onRateLimit when the header is present", async () => {
    const usage: unknown[] = [];
    const usageHdr = JSON.stringify({
      "act_123": [
        {
          call_count: 42,
          total_cputime: 15,
          total_time: 22,
          estimated_time_to_regain_access: 0,
        },
      ],
    });
    const { fetch } = makeMockFetch([
      { body: { data: [] }, headers: { "x-business-use-case-usage": usageHdr } },
    ]);
    const client = new MetaClient({
      accessToken: token,
      fetchImpl: fetch,
      onRateLimit: (u) => usage.push(u),
    });
    await client.listCampaigns("act_123");
    expect(usage).toHaveLength(1);
    expect((usage[0] as { callCount: number }).callCount).toBe(42);
  });

  it("silently ignores malformed rate-limit header", async () => {
    const { fetch } = makeMockFetch([
      { body: { data: [] }, headers: { "x-business-use-case-usage": "not-json" } },
    ]);
    const client = new MetaClient({
      accessToken: token,
      fetchImpl: fetch,
      onRateLimit: () => {
        throw new Error("should not fire on malformed header");
      },
    });
    await expect(client.listCampaigns("act_123")).resolves.toBeDefined();
  });
});

describe("MetaClient — CAPI", () => {
  it("wraps events array and forwards test_event_code", async () => {
    const { fetch, calls } = makeMockFetch([
      { body: { events_received: 1, messages: [], fbtrace_id: "x" } },
    ]);
    const client = new MetaClient({ accessToken: token, fetchImpl: fetch });
    await client.sendCapiEvents(
      "pixel_123",
      [
        {
          event_name: "Purchase",
          event_time: 1_700_000_000,
          event_id: "evt_1",
          action_source: "website",
          user_data: { em: ["hash"] },
        },
      ],
      "TEST1234",
    );
    const body = calls[0].body as { data: unknown[]; test_event_code: string };
    expect(body.data).toHaveLength(1);
    expect(body.test_event_code).toBe("TEST1234");
    expect(calls[0].url).toContain("/pixel_123/events");
  });
});
