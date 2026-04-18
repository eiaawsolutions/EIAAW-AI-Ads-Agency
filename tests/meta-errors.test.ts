import { describe, it, expect } from "vitest";
import { MetaApiError, tryParseMetaError } from "@/integrations/meta";

describe("MetaApiError — classification", () => {
  it("classifies code 190 as auth", () => {
    const e = new MetaApiError({ message: "token", type: "OAuthException", code: 190, fbtrace_id: "x" }, 401);
    expect(e.category).toBe("auth");
    expect(e.retryable).toBe(false);
  });

  it("classifies code 4 as rate_limit and marks retryable", () => {
    const e = new MetaApiError({ message: "rl", type: "ApiException", code: 4, fbtrace_id: "x" }, 400);
    expect(e.category).toBe("rate_limit");
    expect(e.retryable).toBe(true);
  });

  it("classifies code 200 as permission", () => {
    const e = new MetaApiError({ message: "p", type: "Permission", code: 200, fbtrace_id: "x" }, 403);
    expect(e.category).toBe("permission");
    expect(e.retryable).toBe(false);
  });

  it("classifies code 100 as validation", () => {
    const e = new MetaApiError({ message: "v", type: "GraphMethodException", code: 100, fbtrace_id: "x" }, 400);
    expect(e.category).toBe("validation");
  });

  it("classifies 1487xxx codes as policy", () => {
    const e = new MetaApiError(
      { message: "policy", type: "AdError", code: 1487001, fbtrace_id: "x" },
      400,
    );
    expect(e.category).toBe("policy");
  });

  it("classifies code 2 as transient and retryable", () => {
    const e = new MetaApiError({ message: "t", type: "Server", code: 2, is_transient: true, fbtrace_id: "x" }, 500);
    expect(e.category).toBe("transient");
    expect(e.retryable).toBe(true);
  });

  it("classifies HTTP 500 with unknown code as transient via httpStatus fallback", () => {
    const e = new MetaApiError({ message: "?", type: "?", code: 99999, fbtrace_id: "x" }, 503);
    expect(e.category).toBe("transient");
  });

  it("carries fbtraceId for support diagnostics", () => {
    const e = new MetaApiError({ message: "m", type: "T", code: 1, fbtrace_id: "fbtrc_abc" }, 500);
    expect(e.fbtraceId).toBe("fbtrc_abc");
  });

  it("preserves raw error for debugging", () => {
    const raw = { message: "m", type: "T", code: 42, error_subcode: 9, fbtrace_id: "x" };
    const e = new MetaApiError(raw, 500);
    expect(e.raw).toEqual(raw);
    expect(e.subcode).toBe(9);
  });
});

describe("tryParseMetaError", () => {
  it("parses Meta error envelope", () => {
    const err = tryParseMetaError(
      { error: { message: "x", type: "T", code: 4, fbtrace_id: "y" } },
      429,
    );
    expect(err).toBeInstanceOf(MetaApiError);
    expect(err?.category).toBe("rate_limit");
  });

  it("returns null for non-error body", () => {
    expect(tryParseMetaError({ data: [] }, 200)).toBeNull();
  });

  it("returns null for non-object body", () => {
    expect(tryParseMetaError("plain text", 500)).toBeNull();
    expect(tryParseMetaError(null, 500)).toBeNull();
  });
});
