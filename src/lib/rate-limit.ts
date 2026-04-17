/**
 * Rate limiter. Sliding window, token-bucket semantics.
 *
 * Uses Upstash Redis REST API in production (free tier: 10k commands/day,
 * survives container restarts, works across multiple replicas).
 *
 * Falls back to an in-memory Map when UPSTASH env vars are unset — fine
 * for single-replica dev, not safe for prod once we scale horizontally.
 */

type RateLimitResult = { ok: true; remaining: number } | { ok: false; retryAfterSec: number };

type Options = {
  /** Max requests allowed in the window. */
  limit: number;
  /** Window duration in seconds. */
  windowSec: number;
};

// ── In-memory fallback (dev) ────────────────────────────────────────

type Bucket = { count: number; resetAt: number };
const memory = new Map<string, Bucket>();

function memoryLimit(key: string, opts: Options): RateLimitResult {
  const now = Date.now();
  const existing = memory.get(key);
  if (!existing || existing.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + opts.windowSec * 1000 });
    return { ok: true, remaining: opts.limit - 1 };
  }
  if (existing.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  return { ok: true, remaining: opts.limit - existing.count };
}

// Periodic cleanup so memory doesn't grow unbounded in long-running dev.
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memory.entries()) {
      if (v.resetAt <= now) memory.delete(k);
    }
  }, 60_000).unref?.();
}

// ── Upstash Redis (production) ──────────────────────────────────────

async function upstashLimit(key: string, opts: Options): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const redisKey = `rl:${key}`;

  // Pipelined INCR + EXPIRE (first-write-sets-ttl pattern).
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, opts.windowSec, "NX"],
      ["PTTL", redisKey],
    ]),
    // Fail fast — rate-limiter is in the hot path.
    signal: AbortSignal.timeout(500),
  }).catch(() => null);

  if (!res || !res.ok) {
    // Upstash unreachable — fail open, log for observability.
    console.warn("[rate-limit] upstash unreachable, failing open for key", key);
    return { ok: true, remaining: opts.limit };
  }

  const pipeline = (await res.json()) as { result: number }[];
  const count = pipeline[0]?.result ?? 0;
  const ttlMs = pipeline[2]?.result ?? opts.windowSec * 1000;

  if (count > opts.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(ttlMs / 1000)) };
  }
  return { ok: true, remaining: opts.limit - count };
}

// ── Public API ──────────────────────────────────────────────────────

export async function rateLimit(key: string, opts: Options): Promise<RateLimitResult> {
  const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
  if (hasUpstash) return upstashLimit(key, opts);
  return memoryLimit(key, opts);
}

/** Convenience preset for auth endpoints — IP-scoped, strict. */
export async function rateLimitAuth(ip: string): Promise<RateLimitResult> {
  return rateLimit(`auth:${ip}`, { limit: 10, windowSec: 60 });
}
