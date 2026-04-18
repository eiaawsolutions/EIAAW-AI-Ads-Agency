import type { Fetch } from "@/integrations/meta";

/**
 * Lightweight fetch mock for Meta client tests.
 * Each call records a request and returns the next queued response.
 * Supports matchers for URL substring + method to keep tests expressive.
 */

export type MockResponse = {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** If set, mock will throw this error instead of returning a response. */
  throw?: unknown;
};

export type MockCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
};

export function makeMockFetch(responses: MockResponse[]): {
  fetch: Fetch;
  calls: MockCall[];
} {
  const queue = [...responses];
  const calls: MockCall[] = [];

  const fetchImpl: Fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input as URL).toString();
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = init?.headers
      ? Object.fromEntries(
          Object.entries(init.headers as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]),
        )
      : {};
    let body: unknown;
    try {
      body = init?.body ? JSON.parse(String(init.body)) : undefined;
    } catch {
      body = init?.body;
    }
    calls.push({ url, method, headers, body });

    const next = queue.shift();
    if (!next) throw new Error(`mock-fetch: no response queued for ${method} ${url}`);
    if (next.throw) throw next.throw;

    const status = next.status ?? 200;
    const bodyText = next.body !== undefined ? JSON.stringify(next.body) : "";
    return new Response(bodyText, {
      status,
      headers: {
        "content-type": "application/json",
        ...(next.headers ?? {}),
      },
    });
  };

  return { fetch: fetchImpl, calls };
}
