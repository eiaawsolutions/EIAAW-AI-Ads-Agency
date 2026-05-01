import type { Fetch } from "@/integrations/google";

/**
 * Lightweight fetch mock for Google Ads client + OAuth tests.
 * Mirrors tests/helpers/mock-fetch.ts but typed against the Google `Fetch`
 * export so each subsystem has its own boundary.
 *
 * Note: bodies for OAuth calls are form-urlencoded strings, not JSON;
 * we capture them raw without parsing so callers can assertContain()
 * on the encoded text.
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

export function makeMockFetchGoogle(responses: MockResponse[]): {
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

    const contentType = headers["content-type"] ?? "";
    let body: unknown;
    if (init?.body) {
      if (contentType.includes("application/json")) {
        try {
          body = JSON.parse(String(init.body));
        } catch {
          body = init.body;
        }
      } else {
        // Form-urlencoded — keep raw so OAuth tests can substring-match.
        body = String(init.body);
      }
    }
    calls.push({ url, method, headers, body });

    const next = queue.shift();
    if (!next) throw new Error(`mock-fetch-google: no response queued for ${method} ${url}`);
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
