/**
 * Google Ads API REST surface — typed responses for the slice we use.
 *
 * Reference: https://developers.google.com/google-ads/api/rest/reference/rest
 *
 * Notes:
 *  - Google Ads exposes both gRPC and REST. We use REST so the same
 *    `fetch`-based, mock-friendly transport pattern as the Meta client
 *    applies, with no heavy gRPC dependency.
 *  - All resource lookups go through GAQL (Google Ads Query Language) via
 *    POST to `customers/{cid}/googleAds:search` or `:searchStream`.
 *  - Money is returned in **micros** (1 USD = 1_000_000 micros). We
 *    convert to minor units (cents) before persisting.
 *  - Customer IDs are 10-digit strings without dashes when passed to the
 *    API; the dashed form (`XXX-XXX-XXXX`) is UI-only.
 */

export const DEFAULT_API_VERSION = "v18" as const;
export type GoogleAdsApiVersion = "v17" | "v18" | "v19";

/** OAuth 2.0 token response (Google identity platform). */
export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: "Bearer";
  id_token?: string;
};

/** OAuth refresh response — same shape, no refresh_token (existing one stays valid). */
export type GoogleRefreshResponse = Omit<GoogleTokenResponse, "refresh_token">;

/** Token-info inspection (used to extract scopes after exchange). */
export type GoogleTokenInfo = {
  azp?: string;
  aud?: string;
  sub?: string;
  scope: string;
  exp: string;
  expires_in: string;
  email?: string;
  email_verified?: string;
  access_type?: string;
};

/** Top-level error envelope returned by the REST API. */
export type GoogleAdsErrorResponse = {
  error: {
    code: number;
    message: string;
    status: string;
    details?: Array<{
      "@type": string;
      errors?: GoogleAdsFieldError[];
      requestId?: string;
    }>;
  };
};

/** Per-field error inside the `details` array. */
export type GoogleAdsFieldError = {
  errorCode: Record<string, string>;
  message: string;
  trigger?: { stringValue?: string; int64Value?: string };
  location?: { fieldPathElements?: Array<{ fieldName: string }> };
};

/** Result of CustomerService.listAccessibleCustomers. */
export type ListAccessibleCustomersResponse = {
  resourceNames: string[]; // ["customers/1234567890", ...]
};

/** Result of `customers.googleAds:search` (paged). */
export type SearchResponse<T = SearchRow> = {
  results?: T[];
  nextPageToken?: string;
  totalResultsCount?: string;
  fieldMask?: string;
  requestId?: string;
};

/** Streaming search response — REST returns a JSON array of these chunks. */
export type SearchStreamChunk<T = SearchRow> = {
  results?: T[];
  fieldMask?: string;
  requestId?: string;
};

/** Default row shape; use `SearchRow<{customer: {id: string}}>` for narrow typing. */
export type SearchRow = {
  customer?: GoogleAdsCustomer;
  customerClient?: GoogleAdsCustomerClient;
  campaign?: GoogleAdsCampaign;
  metrics?: GoogleAdsMetrics;
  segments?: GoogleAdsSegments;
};

export type GoogleAdsCustomer = {
  resourceName?: string;
  id?: string;
  descriptiveName?: string;
  currencyCode?: string;
  timeZone?: string;
  manager?: boolean;
  testAccount?: boolean;
};

export type GoogleAdsCustomerClient = {
  resourceName?: string;
  clientCustomer?: string; // "customers/1234567890"
  id?: string;
  descriptiveName?: string;
  currencyCode?: string;
  timeZone?: string;
  manager?: boolean;
  testAccount?: boolean;
  level?: string;
  status?: string;
};

export type GoogleAdsCampaign = {
  resourceName?: string;
  id?: string;
  name?: string;
  status?: string;
  advertisingChannelType?: string;
};

export type GoogleAdsMetrics = {
  impressions?: string;        // int64 as string
  clicks?: string;
  costMicros?: string;          // 1_000_000 = 1 unit
  conversions?: number;
  conversionsValue?: number;
  ctr?: number;
  averageCpc?: string;          // micros, string
  averageCpm?: string;
};

export type GoogleAdsSegments = {
  date?: string; // YYYY-MM-DD
};
