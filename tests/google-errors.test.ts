import { describe, it, expect } from "vitest";
import { GoogleAdsApiError, tryParseGoogleAdsError } from "@/integrations/google";

describe("tryParseGoogleAdsError", () => {
  it("returns null for non-error bodies", () => {
    expect(tryParseGoogleAdsError({}, 200)).toBeNull();
    expect(tryParseGoogleAdsError({ results: [] }, 200)).toBeNull();
    expect(tryParseGoogleAdsError(null, 500)).toBeNull();
    expect(tryParseGoogleAdsError("string", 500)).toBeNull();
  });

  it("parses a standard error envelope", () => {
    const err = tryParseGoogleAdsError(
      {
        error: {
          code: 400,
          message: "Bad query",
          status: "INVALID_ARGUMENT",
          details: [
            {
              "@type": "type.googleapis.com/google.ads.googleads.v18.errors.GoogleAdsFailure",
              errors: [
                { errorCode: { queryError: "INVALID_FIELD_NAME" }, message: "Field bad" },
              ],
              requestId: "req-123",
            },
          ],
        },
      },
      400,
    );
    expect(err).toBeInstanceOf(GoogleAdsApiError);
    expect(err?.status).toBe("INVALID_ARGUMENT");
    expect(err?.category).toBe("validation");
    expect(err?.requestId).toBe("req-123");
    expect(err?.fieldErrors).toHaveLength(1);
    expect(err?.fieldErrors[0].message).toBe("Field bad");
  });
});

describe("GoogleAdsApiError classification", () => {
  const cases: Array<{
    status: string;
    httpStatus: number;
    expected: string;
    label: string;
  }> = [
    { status: "UNAUTHENTICATED", httpStatus: 401, expected: "auth", label: "401 → auth" },
    { status: "PERMISSION_DENIED", httpStatus: 403, expected: "permission", label: "403 → permission" },
    { status: "INVALID_ARGUMENT", httpStatus: 400, expected: "validation", label: "400 → validation" },
    { status: "RESOURCE_EXHAUSTED", httpStatus: 429, expected: "rate_limit", label: "429 → rate_limit" },
    { status: "UNAVAILABLE", httpStatus: 503, expected: "transient", label: "503 → transient" },
    { status: "DEADLINE_EXCEEDED", httpStatus: 504, expected: "transient", label: "504 → transient" },
    { status: "NOT_FOUND", httpStatus: 404, expected: "not_found", label: "404 → not_found" },
    { status: "UNKNOWN", httpStatus: 500, expected: "transient", label: "5xx fallback → transient" },
  ];

  for (const c of cases) {
    it(c.label, () => {
      const e = new GoogleAdsApiError(
        { code: c.httpStatus, message: "x", status: c.status },
        c.httpStatus,
      );
      expect(e.category).toBe(c.expected);
    });
  }

  it("retryable: transient and rate_limit only", () => {
    const transient = new GoogleAdsApiError(
      { code: 503, message: "x", status: "UNAVAILABLE" },
      503,
    );
    const rate = new GoogleAdsApiError(
      { code: 429, message: "x", status: "RESOURCE_EXHAUSTED" },
      429,
    );
    const auth = new GoogleAdsApiError(
      { code: 401, message: "x", status: "UNAUTHENTICATED" },
      401,
    );
    expect(transient.retryable).toBe(true);
    expect(rate.retryable).toBe(true);
    expect(auth.retryable).toBe(false);
  });
});
