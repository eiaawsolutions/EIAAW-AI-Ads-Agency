import type { MetaError, MetaErrorResponse } from "./types";

/**
 * Meta Graph API error taxonomy — based on the 2026 error reference.
 * Classification drives retry behavior and surfacing to operators.
 *
 * Full reference: https://developers.facebook.com/docs/marketing-api/error-reference
 */

export type MetaErrorCategory =
  | "auth"          // 190, 102 — token invalid/expired/revoked
  | "rate_limit"    // 4, 17, 32, 613 — app/user/business rate limits
  | "permission"    // 200, 10, 299 — missing scope or business asset access
  | "validation"    // 100 series — bad input, not our fault to retry
  | "policy"        // 1487xxx — ad policy violations, human review needed
  | "transient"     // 2, 1, 5xx — server glitches, retry
  | "business"      // billing, spend limits, account disabled
  | "unknown";

export class MetaApiError extends Error {
  readonly code: number;
  readonly subcode?: number;
  readonly type: string;
  readonly category: MetaErrorCategory;
  readonly fbtraceId: string;
  readonly isTransient: boolean;
  readonly httpStatus: number;
  readonly raw: MetaError;

  constructor(err: MetaError, httpStatus: number) {
    super(err.message);
    this.name = "MetaApiError";
    this.code = err.code;
    this.subcode = err.error_subcode;
    this.type = err.type;
    this.fbtraceId = err.fbtrace_id;
    this.httpStatus = httpStatus;
    this.isTransient = Boolean(err.is_transient);
    this.raw = err;
    this.category = classify(err, httpStatus);
  }

  /**
   * True when a caller should back off and retry. The retry primitive
   * honors this, plus HTTP 5xx with no parsed body.
   */
  get retryable(): boolean {
    return this.category === "transient" || this.category === "rate_limit" || this.isTransient;
  }
}

function classify(err: MetaError, httpStatus: number): MetaErrorCategory {
  if (err.code === 190 || err.code === 102) return "auth";
  if ([4, 17, 32, 613].includes(err.code)) return "rate_limit";
  if ([200, 10, 299].includes(err.code)) return "permission";
  if (err.code === 100) return "validation";
  if (err.code >= 1487000 && err.code < 1488000) return "policy";
  if (err.code === 1487742) return "business"; // account deactivated
  if ([2, 1].includes(err.code)) return "transient";
  if (httpStatus >= 500) return "transient";
  return "unknown";
}

/**
 * Parse an arbitrary Meta response body into a MetaApiError when it carries
 * an `error` envelope. Returns null for non-error bodies.
 */
export function tryParseMetaError(body: unknown, httpStatus: number): MetaApiError | null {
  if (!body || typeof body !== "object") return null;
  const maybe = body as Partial<MetaErrorResponse>;
  if (!maybe.error || typeof maybe.error !== "object") return null;
  return new MetaApiError(maybe.error as MetaError, httpStatus);
}
