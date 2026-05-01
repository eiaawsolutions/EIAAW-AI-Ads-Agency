import { complete, MODELS, structuredComplete } from "@/lib/anthropic";
import type { AgentResult } from "./types";

// Pricing per 1M tokens — update when Anthropic changes pricing.
const PRICING: Record<string, { inUsd: number; outUsd: number }> = {
  "claude-opus-4-7": { inUsd: 15, outUsd: 75 },
  "claude-sonnet-4-6": { inUsd: 3, outUsd: 15 },
  "claude-haiku-4-5-20251001": { inUsd: 0.8, outUsd: 4 },
};

export function costOf(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model] ?? PRICING[MODELS.primary];
  return (tokensIn * p.inUsd + tokensOut * p.outUsd) / 1_000_000;
}

/**
 * Prompt registry — every system prompt has a version string. The version
 * lands in AgentRun.output._meta so we can reconstruct exact behavior for
 * any past run, and diff quality between prompt revisions.
 */
export const PROMPT_VERSION = "2026.04.18-1";

/**
 * Invoke Claude with a JSON-response contract. Returns parsed JSON or
 * falls back to a structured error.
 *
 * The system prompt is marked for ephemeral cache — repeat calls with the
 * same system prompt within 5 minutes pay 10% of the input-token price.
 */
export async function jsonComplete<T>(opts: {
  system: string;
  user: string;
  schemaName: string;
  model?: string;
  maxTokens?: number;
}): Promise<AgentResult<T>> {
  const system = `${opts.system}

You MUST respond with a single JSON object matching the "${opts.schemaName}" contract. No prose, no markdown, no code fences — raw JSON only. Keep prose fields concise to avoid truncation.

ALWAYS include a top-level "summary" string field: one sentence (≤120 chars) describing the most useful takeaway from this run, e.g. "Identified 3 high-intent personas with palette anchored on warm coral." This powers the activity feed.`;

  const initialMaxTokens = opts.maxTokens ?? 4096;

  const res = await complete({
    system,
    user: opts.user,
    model: opts.model,
    maxTokens: initialMaxTokens,
    temperature: 0.2,
    cacheSystem: true,
  });

  if (res.stubbed) {
    return {
      ok: true,
      output: withMeta(stubOutput<T>(opts.schemaName), {
        schema: opts.schemaName,
        promptVersion: PROMPT_VERSION,
        model: res.model,
        stubbed: true,
      }),
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      model: res.model,
      stubbed: true,
    };
  }

  const firstParse = tryParseJson<T>(res.text);
  if (firstParse.ok) {
    return {
      ok: true,
      output: withMeta(firstParse.value, {
        schema: opts.schemaName,
        promptVersion: PROMPT_VERSION,
        model: res.model,
        stubbed: false,
      }),
      tokensIn: res.tokensIn,
      tokensOut: res.tokensOut,
      costUsd: costOf(res.model, res.tokensIn, res.tokensOut),
      model: res.model,
    };
  }

  // Retry once with doubled token cap when the model hit max_tokens — common
  // cause of mid-string truncation that produces "Expected ',' or '}'" errors.
  if (res.stopReason === "max_tokens") {
    const retry = await complete({
      system,
      user: opts.user,
      model: opts.model,
      maxTokens: Math.min(initialMaxTokens * 2, 8192),
      temperature: 0.2,
      cacheSystem: true,
    });
    const retryParse = tryParseJson<T>(retry.text);
    const totalIn = res.tokensIn + retry.tokensIn;
    const totalOut = res.tokensOut + retry.tokensOut;
    const totalCost = costOf(res.model, res.tokensIn, res.tokensOut) + costOf(retry.model, retry.tokensIn, retry.tokensOut);
    if (retryParse.ok) {
      return {
        ok: true,
        output: withMeta(retryParse.value, {
          schema: opts.schemaName,
          promptVersion: PROMPT_VERSION,
          model: retry.model,
          stubbed: false,
        }),
        tokensIn: totalIn,
        tokensOut: totalOut,
        costUsd: totalCost,
        model: retry.model,
      };
    }
    return {
      ok: false,
      error: friendlyParseError(retryParse.error, retry.stopReason ?? res.stopReason),
      tokensIn: totalIn,
      tokensOut: totalOut,
      costUsd: totalCost,
      model: retry.model,
    };
  }

  return {
    ok: false,
    error: friendlyParseError(firstParse.error, res.stopReason),
    tokensIn: res.tokensIn,
    tokensOut: res.tokensOut,
    costUsd: costOf(res.model, res.tokensIn, res.tokensOut),
    model: res.model,
  };
}

function tryParseJson<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } {
  try {
    const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, "");
    return { ok: true, value: JSON.parse(cleaned) as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function friendlyParseError(rawErr: string, stopReason: string | null): string {
  if (stopReason === "max_tokens") {
    return "The agent's response was too long and got cut off. Try simplifying inputs or contact support if this keeps happening.";
  }
  return `The agent returned a malformed response. Try again — if it persists, the model may be having a bad day. (${rawErr})`;
}

/**
 * Structured-output variant of jsonComplete. Forces the model to emit
 * a tool_use call whose input matches the JSON Schema, so we never have
 * to parse free-form text. Eliminates the JSON parse-error class
 * (truncation, unescaped quotes, code fences).
 *
 * Use this for any agent whose Output type is large enough that
 * truncation has been observed (e.g. ADS_PLAN, ADS_AUDIT).
 */
export async function toolComplete<T>(opts: {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
  stubData: T;
  model?: string;
  maxTokens?: number;
}): Promise<AgentResult<T>> {
  const res = await structuredComplete<T>({
    system: opts.system,
    user: opts.user,
    toolName: opts.toolName,
    toolDescription: opts.toolDescription,
    schema: opts.schema,
    stubData: opts.stubData,
    model: opts.model,
    maxTokens: opts.maxTokens ?? 4096,
    cacheSystem: true,
  });

  if (res.stubbed && res.data) {
    return {
      ok: true,
      output: withMeta(res.data, {
        schema: opts.toolName,
        promptVersion: PROMPT_VERSION,
        model: res.model,
        stubbed: true,
      }),
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      model: res.model,
      stubbed: true,
    };
  }

  if (!res.data) {
    return {
      ok: false,
      error: res.toolError ?? friendlyParseError("no tool block", res.stopReason),
      tokensIn: res.tokensIn,
      tokensOut: res.tokensOut,
      costUsd: costOf(res.model, res.tokensIn, res.tokensOut),
      model: res.model,
    };
  }

  return {
    ok: true,
    output: withMeta(res.data, {
      schema: opts.toolName,
      promptVersion: PROMPT_VERSION,
      model: res.model,
      stubbed: false,
    }),
    tokensIn: res.tokensIn,
    tokensOut: res.tokensOut,
    costUsd: costOf(res.model, res.tokensIn, res.tokensOut),
    model: res.model,
  };
}

/**
 * Attach _meta to the agent output for reproducibility. Non-enumerable
 * so it doesn't leak into UI rendering loops that just iterate keys.
 */
function withMeta<T>(payload: T, meta: { schema: string; promptVersion: string; model: string; stubbed: boolean }): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    Object.defineProperty(payload, "_meta", { value: meta, enumerable: false, writable: false });
  }
  return payload;
}

/**
 * Deterministic, schema-aware stub output so the app remains fully
 * interactive without an ANTHROPIC_API_KEY during development.
 */
function stubOutput<T>(schema: string): T {
  const stubs: Record<string, unknown> = {
    BrandDna: {
      summary: "1 persona · 2 markets · palette anchored on #14B39B",
      businessGoals: ["sales", "leads"],
      valueProps: ["Premium quality", "Fast delivery", "30-day guarantee"],
      positioning: "Category-defining solution for discerning customers.",
      personas: [{ name: "Growth Grace", age: "28-45", channels: ["IG", "Google Search"] }],
      markets: ["US", "CA"],
      toneOfVoice: { pillars: ["confident", "clear", "modern"], banned: ["cheap"] },
      colorPalette: { primary: "#14B39B", secondary: "#083C3C", accent: "#5DDECA" },
      typography: { display: "Inter", body: "Inter" },
      imageryStyle: "clean editorial with warm lighting",
    },
    AdsPlan: {
      summary: "META 40% · GOOGLE 40% · TIKTOK 20% · target CPA $25",
      funnel: { tof: 0.5, mof: 0.3, bof: 0.2 },
      allocation: { META: 0.4, GOOGLE: 0.4, TIKTOK: 0.2 },
      kpis: { targetCpa: 25, targetRoas: 3.0, targetCtr: 1.5 },
      rationale: "Balanced TOF/BOF split with Meta + Google anchoring performance.",
    },
    Competitor: {
      summary: "2 competitors mapped · 2 trends · 1 whitespace gap",
      competitors: [
        { name: "Alpha Co", spendEstimate: "$120k/mo", topFormats: ["Reels", "Search"] },
        { name: "Beta Ltd", spendEstimate: "$80k/mo", topFormats: ["Display", "YouTube"] },
      ],
      trends: ["UGC with creator voiceover", "Before/after static"],
      gaps: ["Owned content on Performance Max missing"],
    },
    AdCopy: {
      summary: "2 ad concepts drafted (Proof, Benefit angles)",
      concepts: [
        { angle: "Proof", headline: "7,000 reviews. One honest formula.", body: "…", cta: "Shop now" },
        { angle: "Benefit", headline: "Clinical results in 30 days.", body: "…", cta: "Try risk-free" },
      ],
    },
    Forecast: {
      summary: "3 scenarios · ROAS 2.7x – 4.5x at $5k spend",
      scenarios: [
        { label: "Conservative", spend: 5000, revenue: 13500, roas: 2.7, cpa: 28 },
        { label: "Moderate", spend: 5000, revenue: 17500, roas: 3.5, cpa: 22 },
        { label: "Aggressive", spend: 5000, revenue: 22500, roas: 4.5, cpa: 18 },
      ],
    },
    Experiment: {
      summary: "A/B test designed · n=2400 · primary metric ROAS",
      hypothesis: "Proof headline beats benefit headline on ROAS by ≥10%.",
      variants: [
        { key: "A", headline: "Benefit-led", trafficPct: 50 },
        { key: "B", headline: "Proof-led", trafficPct: 50 },
      ],
      minSampleSize: 2400,
      primaryMetric: "roas",
    },
    AuditReport: {
      summary: "Score 78/100 · 2 findings (1 P0 tracking, 1 P1 creative)",
      score: 78,
      findings: [
        { severity: "P0", area: "tracking", note: "CAPI not deduplicating Pixel events." },
        { severity: "P1", area: "creative", note: "Fatigue at 2.4 frequency on 3 top ads." },
      ],
    },
  };
  return (stubs[schema] ?? {}) as T;
}
