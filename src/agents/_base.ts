import { complete, MODELS } from "@/lib/anthropic";
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

You MUST respond with a single JSON object matching the "${opts.schemaName}" contract. No prose, no markdown, no code fences — raw JSON only.`;

  const res = await complete({
    system,
    user: opts.user,
    model: opts.model,
    maxTokens: opts.maxTokens ?? 2048,
    temperature: 0.2,
    cacheSystem: true,
  });

  const costUsd = costOf(res.model, res.tokensIn, res.tokensOut);

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

  try {
    const jsonText = res.text.trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(jsonText) as T;
    return {
      ok: true,
      output: withMeta(parsed, {
        schema: opts.schemaName,
        promptVersion: PROMPT_VERSION,
        model: res.model,
        stubbed: false,
      }),
      tokensIn: res.tokensIn,
      tokensOut: res.tokensOut,
      costUsd,
      model: res.model,
    };
  } catch (err) {
    return {
      ok: false,
      error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
      tokensIn: res.tokensIn,
      tokensOut: res.tokensOut,
      costUsd,
      model: res.model,
    };
  }
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
      funnel: { tof: 0.5, mof: 0.3, bof: 0.2 },
      allocation: { META: 0.4, GOOGLE: 0.4, TIKTOK: 0.2 },
      kpis: { targetCpa: 25, targetRoas: 3.0, targetCtr: 1.5 },
      rationale: "Balanced TOF/BOF split with Meta + Google anchoring performance.",
    },
    Competitor: {
      competitors: [
        { name: "Alpha Co", spendEstimate: "$120k/mo", topFormats: ["Reels", "Search"] },
        { name: "Beta Ltd", spendEstimate: "$80k/mo", topFormats: ["Display", "YouTube"] },
      ],
      trends: ["UGC with creator voiceover", "Before/after static"],
      gaps: ["Owned content on Performance Max missing"],
    },
    AdCopy: {
      concepts: [
        { angle: "Proof", headline: "7,000 reviews. One honest formula.", body: "…", cta: "Shop now" },
        { angle: "Benefit", headline: "Clinical results in 30 days.", body: "…", cta: "Try risk-free" },
      ],
    },
    Forecast: {
      scenarios: [
        { label: "Conservative", spend: 5000, revenue: 13500, roas: 2.7, cpa: 28 },
        { label: "Moderate", spend: 5000, revenue: 17500, roas: 3.5, cpa: 22 },
        { label: "Aggressive", spend: 5000, revenue: 22500, roas: 4.5, cpa: 18 },
      ],
    },
    Experiment: {
      hypothesis: "Proof headline beats benefit headline on ROAS by ≥10%.",
      variants: [
        { key: "A", headline: "Benefit-led", trafficPct: 50 },
        { key: "B", headline: "Proof-led", trafficPct: 50 },
      ],
      minSampleSize: 2400,
      primaryMetric: "roas",
    },
    AuditReport: {
      score: 78,
      findings: [
        { severity: "P0", area: "tracking", note: "CAPI not deduplicating Pixel events." },
        { severity: "P1", area: "creative", note: "Fatigue at 2.4 frequency on 3 top ads." },
      ],
    },
  };
  return (stubs[schema] ?? {}) as T;
}
