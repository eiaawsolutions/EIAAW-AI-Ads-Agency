import type { GoogleAdsErrorResponse, GoogleAdsFieldError } from "./types";

/**
 * Google Ads API error taxonomy.
 *
 * Classification drives retry behavior and surfacing to operators.
 * Reference: https://developers.google.com/google-ads/api/docs/troubleshooting/error-types
 */

export type GoogleAdsErrorCategory =
  | "auth"          // 401 — token invalid/expired/revoked
  | "rate_limit"    // 429, RESOURCE_EXHAUSTED — quota / per-minute caps
  | "permission"    // 403 — missing scope, dev token tier, customer not linked
  | "validation"    // 400, INVALID_ARGUMENT — bad GAQL or payload
  | "policy"        // ad-policy violations (rare on read-only paths)
  | "transient"     // 5xx, UNAVAILABLE, DEADLINE_EXCEEDED
  | "not_found"     // 404, NOT_FOUND
  | "unknown";

export class GoogleAdsApiError extends Error {
  readonly httpStatus: number;
  readonly status: string;          // e.g. "INVALID_ARGUMENT", "PERMISSION_DENIED"
  readonly category: GoogleAdsErrorCategory;
  readonly fieldErrors: GoogleAdsFieldError[];
  readonly requestId?: string;
  readonly raw: GoogleAdsErrorResponse["error"];

  constructor(err: GoogleAdsErrorResponse["error"], httpStatus: number) {
    super(err.message || `Google Ads API error (HTTP ${httpStatus})`);
    this.name = "GoogleAdsApiError";
    this.httpStatus = httpStatus;
    this.status = err.status ?? "UNKNOWN";
    this.raw = err;

    const fieldErrors: GoogleAdsFieldError[] = [];
    let requestId: string | undefined;
    for (const detail of err.details ?? []) {
      if (Array.isArray(detail.errors)) fieldErrors.push(...detail.errors);
      if (detail.requestId) requestId = detail.requestId;
    }
    this.fieldErrors = fieldErrors;
    this.requestId = requestId;
    this.category = classify(err.status, httpStatus);
  }

  /** True when a caller should back off and retry. */
  get retryable(): boolean {
    return this.category === "transient" || this.category === "rate_limit";
  }
}

function classify(status: string, httpStatus: number): GoogleAdsErrorCategory {
  switch (status) {
    case "UNAUTHENTICATED":
      return "auth";
    case "PERMISSION_DENIED":
      return "permission";
    case "INVALID_ARGUMENT":
    case "FAILED_PRECONDITION":
    case "OUT_OF_RANGE":
      return "validation";
    case "RESOURCE_EXHAUSTED":
      return "rate_limit";
    case "UNAVAILABLE":
    case "DEADLINE_EXCEEDED":
    case "INTERNAL":
    case "ABORTED":
      return "transient";
    case "NOT_FOUND":
      return "not_found";
  }
  if (httpStatus === 401) return "auth";
  if (httpStatus === 403) return "permission";
  if (httpStatus === 404) return "not_found";
  if (httpStatus === 429) return "rate_limit";
  if (httpStatus >= 500) return "transient";
  if (httpStatus >= 400) return "validation";
  return "unknown";
}

/**
 * Parse an arbitrary Google Ads response body into a GoogleAdsApiError when
 * it carries an `error` envelope. Returns null for non-error bodies.
 */
export function tryParseGoogleAdsError(
  body: unknown,
  httpStatus: number,
): GoogleAdsApiError | null {
  if (!body || typeof body !== "object") return null;
  const maybe = body as Partial<GoogleAdsErrorResponse>;
  if (!maybe.error || typeof maybe.error !== "object") return null;
  return new GoogleAdsApiError(maybe.error as GoogleAdsErrorResponse["error"], httpStatus);
}
