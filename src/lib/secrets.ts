/**
 * Infisical secret resolver.
 *
 * Translates `secret://<workspace>/<env>/<path>/<NAME>` handles into real
 * values via the Infisical Node SDK using universal-auth (machine
 * identity). Called once at server boot from instrumentation.ts; rewrites
 * process.env in-place so the rest of the app reads values normally
 * via `process.env.<NAME>`.
 *
 * Per the EIAAW Deploy Contract:
 *   - The ONLY raw secrets in env are INFISICAL_APP_CLIENT_ID,
 *     INFISICAL_APP_CLIENT_SECRET, INFISICAL_PROJECT_ID, plus things
 *     Next.js inlines at build time (NEXT_PUBLIC_*) and DB connection
 *     strings Railway injects.
 *   - Every other secret value lives in Infisical, referenced by handle.
 *
 * No-op when INFISICAL_RESOLVER_ENABLED !== "true". Dev keeps using raw
 * .env values; production requires the resolver explicitly opted in so
 * a misconfig in dev can't pretend to be working.
 */

import { InfisicalSDK } from "@infisical/sdk";
import { RESOLVABLE_ENV_KEYS, isOptionalEnvKey } from "@/config/secrets";

type CacheEntry = { value: string; expiresAt: number };

const HANDLE_PREFIX = "secret://";
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

let client: InfisicalSDK | null = null;
let loginPromise: Promise<void> | null = null;

function isEnabled(): boolean {
  return process.env.INFISICAL_RESOLVER_ENABLED === "true";
}

async function ensureClient(): Promise<InfisicalSDK> {
  if (client) return client;
  if (loginPromise) {
    await loginPromise;
    if (client) return client;
  }

  const clientId = process.env.INFISICAL_APP_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_APP_CLIENT_SECRET;
  const siteUrl = process.env.INFISICAL_SITE_URL ?? "https://app.infisical.com";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Infisical resolver is enabled but INFISICAL_APP_CLIENT_ID / INFISICAL_APP_CLIENT_SECRET are missing.",
    );
  }

  const sdk = new InfisicalSDK({ siteUrl });
  loginPromise = (async () => {
    await sdk.auth().universalAuth.login({ clientId, clientSecret });
    client = sdk;
  })();
  await loginPromise;
  if (!client) throw new Error("Infisical login failed.");
  return client;
}

type ParsedHandle = {
  workspaceSlug: string;
  environment: string;
  secretPath: string;
  secretName: string;
};

/**
 * Parse `secret://<workspace>/<env>/<path...>/<NAME>`. The first two
 * segments are workspace + env; everything between them and the trailing
 * NAME is the secret-path (defaults to "/" when only a name is given).
 *
 * Examples:
 *   secret://eiaaw-prod/prod/STRIPE_SECRET_KEY
 *     → { workspaceSlug: "eiaaw-prod", environment: "prod",
 *         secretPath: "/", secretName: "STRIPE_SECRET_KEY" }
 *   secret://eiaaw-prod/prod/integrations/meta/META_APP_SECRET
 *     → { workspaceSlug: "eiaaw-prod", environment: "prod",
 *         secretPath: "/integrations/meta", secretName: "META_APP_SECRET" }
 */
function parseHandle(handle: string): ParsedHandle | null {
  if (!handle.startsWith(HANDLE_PREFIX)) return null;
  const rest = handle.slice(HANDLE_PREFIX.length);
  const parts = rest.split("/").filter((s) => s.length > 0);
  if (parts.length < 3) return null;
  const [workspaceSlug, environment, ...rest2] = parts;
  const secretName = rest2.pop() as string;
  const secretPath = rest2.length === 0 ? "/" : `/${rest2.join("/")}`;
  return { workspaceSlug, environment, secretPath, secretName };
}

async function fetchSecret(p: ParsedHandle): Promise<string> {
  const cacheKey = `${p.workspaceSlug}|${p.environment}|${p.secretPath}|${p.secretName}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const sdk = await ensureClient();
  const projectId = process.env.INFISICAL_PROJECT_ID;
  if (!projectId) {
    throw new Error("INFISICAL_PROJECT_ID is required for resolver.");
  }

  const res = await sdk.secrets().getSecret({
    projectId,
    environment: p.environment,
    secretPath: p.secretPath,
    secretName: p.secretName,
  });

  const value = res?.secretValue;
  if (typeof value !== "string") {
    throw new Error(`Infisical secret not found: ${p.secretName} at ${p.environment}${p.secretPath}`);
  }

  cache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

/**
 * Walk RESOLVABLE_ENV_KEYS, resolve any `secret://...` handles found,
 * and rewrite process.env in place. Idempotent — safe to call multiple
 * times. Errors per-key are logged and surfaced once at the end so a
 * single bad handle doesn't silently leave half the env unresolved.
 */
export async function resolveEnvFromInfisical(): Promise<{
  resolved: string[];
  skipped: string[];
  failed: { key: string; reason: string }[];
}> {
  const resolved: string[] = [];
  const skipped: string[] = [];
  const failed: { key: string; reason: string }[] = [];

  if (!isEnabled()) {
    return { resolved, skipped: RESOLVABLE_ENV_KEYS.slice(), failed };
  }

  for (const key of RESOLVABLE_ENV_KEYS) {
    const raw = process.env[key];
    if (!raw) {
      skipped.push(key);
      continue;
    }
    const parsed = parseHandle(raw);
    if (!parsed) {
      // Already a raw value (or empty) — nothing to do.
      skipped.push(key);
      continue;
    }
    try {
      const value = await fetchSecret(parsed);
      process.env[key] = value;
      resolved.push(key);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      // Optional keys: a 404 ("not found") means the operator hasn't
      // provisioned this handle yet — that's acceptable, the consuming
      // code has a graceful fallback (e.g., STRIPE_PRICE_* lazy-create,
      // adapters fall back to stub mode). Non-404 errors (network,
      // auth, malformed) on optional keys still fail to surface real
      // problems.
      const is404 = /not\s*found|404|StatusCode=404/i.test(reason);
      if (is404 && isOptionalEnvKey(key)) {
        console.warn(`[infisical] optional ${key} not found in Infisical — skipping (consuming code has fallback)`);
        // Clear the unresolved handle so consuming code sees undefined,
        // not the literal "secret://..." string.
        delete process.env[key];
        skipped.push(key);
      } else {
        failed.push({ key, reason });
      }
    }
  }

  if (failed.length > 0) {
    const detail = failed.map((f) => `${f.key} (${f.reason})`).join("; ");
    throw new Error(`Infisical resolver failed for ${failed.length} key(s): ${detail}`);
  }

  return { resolved, skipped, failed };
}
