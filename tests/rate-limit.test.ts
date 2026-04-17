import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit (in-memory fallback)", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("allows up to the limit within the window", async () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const r = await rateLimit(key, { limit: 3, windowSec: 5 });
      expect(r.ok).toBe(true);
    }
  });

  it("rejects once the limit is exceeded", async () => {
    const key = `test:${Math.random()}`;
    const opts = { limit: 2, windowSec: 5 };
    await rateLimit(key, opts);
    await rateLimit(key, opts);
    const r = await rateLimit(key, opts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates keys", async () => {
    const a = await rateLimit(`a:${Math.random()}`, { limit: 1, windowSec: 5 });
    const b = await rateLimit(`b:${Math.random()}`, { limit: 1, windowSec: 5 });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });
});
