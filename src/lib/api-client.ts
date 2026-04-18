"use client";

import { toast } from "sonner";

/**
 * Client-side fetch wrapper that turns API friction into useful UI state.
 *
 *  - 429  → friendly toast with retry countdown + Retry-After header
 *  - 402  → cost-cap toast pointing to /dashboard/settings
 *  - 401  → login prompt
 *  - 5xx  → generic "server error" toast
 *
 * Only for calls to our own /api/* routes — don't wrap external APIs with this.
 */
export async function apiFetch<T = unknown>(
  input: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    toast.error("Network error — check your connection");
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "network" };
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? "60");
    showRateLimitToast(retryAfter);
    return { ok: false, status: 429, error: "rate limited" };
  }

  if (res.status === 402) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      spentUsd?: number;
      capUsd?: number;
    };
    toast.error("Daily AI cost cap reached", {
      description:
        typeof body.spentUsd === "number"
          ? `$${body.spentUsd.toFixed(2)} of $${body.capUsd?.toFixed(2)} used. Upgrade plan or retry tomorrow.`
          : body.error ?? "Upgrade plan or retry tomorrow.",
      action: {
        label: "Settings",
        onClick: () => {
          window.location.href = "/dashboard/settings";
        },
      },
    });
    return { ok: false, status: 402, error: body.error ?? "cost cap" };
  }

  if (res.status === 401) {
    toast.error("Please sign in to continue", {
      action: {
        label: "Sign in",
        onClick: () => {
          window.location.href = "/signin";
        },
      },
    });
    return { ok: false, status: 401, error: "unauthorized" };
  }

  if (res.status >= 500) {
    toast.error("Something went wrong on our end", { description: "We've logged it — try again in a moment." });
    return { ok: false, status: res.status, error: "server error" };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  if (!res.ok) {
    const err = (body as { error?: string }).error ?? `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: err };
  }

  return { ok: true, data: body as T };
}

/** Show a rate-limit toast that counts down the retry window in real time. */
function showRateLimitToast(retryAfter: number) {
  const id = `rate-limit-${Date.now()}`;
  let remaining = Math.max(1, retryAfter);

  toast.error("Slow down — hitting our rate limit", {
    id,
    description: `Retry in ${remaining}s.`,
    duration: remaining * 1000 + 500,
  });

  const tick = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(tick);
      toast.success("Ready to try again", { id });
      return;
    }
    toast.error("Slow down — hitting our rate limit", {
      id,
      description: `Retry in ${remaining}s.`,
      duration: remaining * 1000 + 500,
    });
  }, 1000);
}
