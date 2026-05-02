/**
 * Allow-list of env vars whose value MAY be an Infisical `secret://...`
 * handle. The resolver walks this list at boot, fetches values, and
 * rewrites process.env. Keys not in this list are passed through
 * untouched — safe for raw values.
 *
 * What goes here: any production secret whose value is sensitive
 * (API keys, OAuth client secrets, signing keys, encryption keys).
 *
 * What does NOT go here:
 *   - Bootstrap creds (INFISICAL_*) — needed BEFORE the resolver runs
 *   - NEXT_PUBLIC_* — Next.js inlines these at build time
 *   - DATABASE_URL / DIRECT_URL — Railway injects directly; Prisma reads
 *     at first use (post-boot), so a handle would technically work, but
 *     keeping these raw is the convention for DB connection strings
 *   - NODE_ENV / AUTH_URL / PORT — non-secret runtime config
 *
 * Required vs optional:
 *   - REQUIRED keys missing in Infisical (404) HARD-FAIL the boot. Use
 *     for anything the app cannot start or operate without.
 *   - OPTIONAL keys missing in Infisical are warned + skipped. Use for
 *     handles that the code already has a graceful fallback for. The
 *     SMT (Sales Marketing Agent) pattern is the reference: it stores
 *     Stripe price IDs in DB and lazy-creates them in Stripe on first
 *     checkout when not yet known. Same pattern here for STRIPE_PRICE_*.
 *
 * Add new keys here as new integrations are wired.
 */

/**
 * Hard-required: a 404 from Infisical for any of these crashes the boot.
 * Use only for handles the app genuinely cannot start without.
 */
export const REQUIRED_ENV_KEYS = [
  // Auth
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",

  // Anthropic (agent brain)
  "ANTHROPIC_API_KEY",

  // Stripe core (signup flow needs these to function)
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",

  // Token-encryption + worker
  "EIAAW_ENCRYPTION_KEY",
  "EIAAW_WORKER_SECRET",
] as const;

/**
 * Optional: a 404 from Infisical for any of these is logged + skipped.
 * The consuming code is responsible for graceful fallback.
 */
export const OPTIONAL_ENV_KEYS = [
  // Stripe price IDs — lazy-created in Stripe on first checkout if absent.
  // Persisted to the Setting model (DB) for reuse across restarts.
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_GROWTH",
  "STRIPE_PRICE_ENTERPRISE",

  // Cost-cap override (admin-only emergency switch — app runs without it)
  "EIAAW_COST_OVERRIDE_SECRET",

  // Rate limiting (Redis falls back to in-memory if unset)
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",

  // Observability (Sentry off-by-default if unset)
  "SENTRY_DSN",

  // Transactional email (Resend) — welcome email is best-effort; signup
  // still works without it, sender just sees a console.warn in logs.
  "RESEND_API_KEY",
  "RESEND_FROM",

  // Ad platform OAuth credentials — each adapter falls back to stub mode
  // if its creds are missing.
  "META_APP_ID",
  "META_APP_SECRET",
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
  "TIKTOK_APP_ID",
  "TIKTOK_APP_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "MICROSOFT_DEVELOPER_TOKEN",
  "YOUTUBE_CLIENT_ID",
  "YOUTUBE_CLIENT_SECRET",
  "APPLE_ADS_ORG_ID",
  "APPLE_ADS_KEY_ID",
  "APPLE_ADS_PRIVATE_KEY",
] as const;

/**
 * Combined list — what the resolver walks. Order: required first so a
 * missing required handle fails fast before we waste API calls on optional
 * keys.
 */
export const RESOLVABLE_ENV_KEYS = [
  ...REQUIRED_ENV_KEYS,
  ...OPTIONAL_ENV_KEYS,
] as const;

const OPTIONAL_SET = new Set<string>(OPTIONAL_ENV_KEYS);
export function isOptionalEnvKey(key: string): boolean {
  return OPTIONAL_SET.has(key);
}

export type ResolvableEnvKey = (typeof RESOLVABLE_ENV_KEYS)[number];
