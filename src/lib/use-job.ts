"use client";

import { useEffect, useRef, useState } from "react";

type Step = {
  index: number;
  kind: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";
  output: unknown;
  error: string | null;
  attempts: number;
  startedAt: string | null;
  endedAt: string | null;
};

export type JobState = {
  id: string;
  kind: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";
  cursor: number;
  error: string | null;
  correlationId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  steps: Step[];
};

export type UseJobResult = {
  data: JobState | null;
  loading: boolean;
  error: string | null;
  /** true while the job is active (poller still running). */
  live: boolean;
};

/**
 * Poll /api/jobs/:id every `intervalMs` until status terminates.
 * Stops polling on SUCCEEDED/FAILED/CANCELED or on unmount. Pauses when
 * the tab is hidden to save Upstash + DB commands.
 */
export function useJob(correlationId: string | null | undefined, intervalMs = 2000): UseJobResult {
  const [data, setData] = useState<JobState | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(correlationId));
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!correlationId) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;

    const poll = async () => {
      if (document.hidden) {
        // Tab hidden — skip this tick, retry when visible.
        timerRef.current = setTimeout(poll, intervalMs);
        return;
      }
      try {
        const res = await fetch(`/api/jobs/${correlationId}`, { cache: "no-store" });
        if (cancelled || !mountedRef.current) return;
        if (res.status === 404) {
          // Not yet visible (enqueue race) — keep polling briefly.
          timerRef.current = setTimeout(poll, intervalMs);
          return;
        }
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          setLoading(false);
          return;
        }
        const body = (await res.json()) as { ok: boolean; job?: JobState };
        if (!body.ok || !body.job) {
          setError("invalid response");
          setLoading(false);
          return;
        }
        if (!mountedRef.current) return;
        setData(body.job);
        setError(null);
        setLoading(false);

        const terminal = ["SUCCEEDED", "FAILED", "CANCELED"].includes(body.job.status);
        if (!terminal) timerRef.current = setTimeout(poll, intervalMs);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : "poll failed");
        timerRef.current = setTimeout(poll, intervalMs * 2);
      }
    };

    setLoading(true);
    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [correlationId, intervalMs]);

  const live = Boolean(data && !["SUCCEEDED", "FAILED", "CANCELED"].includes(data.status));
  return { data, loading, error, live };
}
