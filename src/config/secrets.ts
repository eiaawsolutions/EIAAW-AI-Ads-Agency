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
 * Add new keys here as new integrations are wired. The resolver
 * silently passes through empty values, so it's safe to leave unset
 * keys in the list during incremental rollout.
 */

export const RESOLVABLE_ENV_KEYS = [
  // Auth
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",

  // Anthropic (agent brain)
  "ANTHROPIC_API_KEY",

  // Stripe
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_GROWTH",
  "STRIPE_PRICE_ENTERPRISE",

  // Token-encryption + cost-cap override + worker
  "EIAAW_ENCRYPTION_KEY",
  "EIAAW_COST_OVERRIDE_SECRET",
  "EIAAW_WORKER_SECRET",

  // Rate limiting
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",

  // Observability
  "SENTRY_DSN",

  // Ad platform OAuth credentials (added incrementally per platform)
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

export type ResolvableEnvKey = (typeof RESOLVABLE_ENV_KEYS)[number];
