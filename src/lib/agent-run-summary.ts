/**
 * Server-side renderers for the Live monitor row text.
 *
 * - summarizeOutput: success rows get a domain-specific one-liner
 *   ("3 competitors · 2 trends · 1 gap") instead of just the agent kind
 * - formatRunError: failure rows get a clean readable line instead of
 *   raw Zod issue JSON or position-N parse errors
 */

type JsonObj = Record<string, unknown>;

function isObj(v: unknown): v is JsonObj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function len(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

const N_DASH = " · ";

export function summarizeOutput(kind: string, output: unknown, fallback: string): string {
  if (!isObj(output)) return fallback;

  // Many agents will eventually have a server-set `summary` field. Honor it first.
  if (typeof output.summary === "string" && output.summary.trim()) {
    return String(output.summary).slice(0, 120);
  }

  switch (kind) {
    case "ADS_DNA": {
      const personas = len(output.personas);
      const markets = len(output.markets);
      const palette = isObj(output.colorPalette) ? output.colorPalette.primary : undefined;
      const parts = [
        personas ? `${personas} personas` : null,
        markets ? `${markets} markets` : null,
        typeof palette === "string" ? `palette ${palette}` : null,
      ].filter(Boolean);
      return parts.length ? parts.join(N_DASH) : fallback;
    }
    case "ADS_PLAN": {
      const allocation = isObj(output.allocation) ? output.allocation : null;
      const top = allocation
        ? Object.entries(allocation)
            .filter(([, v]) => typeof v === "number")
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .slice(0, 3)
            .map(([k, v]) => `${k} ${Math.round(Number(v) * 100)}%`)
            .join(N_DASH)
        : "";
      return top || fallback;
    }
    case "ADS_COMPETITOR": {
      const c = len(output.competitors);
      const t = len(output.trends);
      const g = len(output.gaps);
      const parts = [
        c ? `${c} competitor${c === 1 ? "" : "s"}` : null,
        t ? `${t} trend${t === 1 ? "" : "s"}` : null,
        g ? `${g} gap${g === 1 ? "" : "s"}` : null,
      ].filter(Boolean);
      return parts.length ? parts.join(N_DASH) : fallback;
    }
    case "ADS_CREATE": {
      const concepts = len(output.concepts);
      return concepts ? `${concepts} concept${concepts === 1 ? "" : "s"}` : fallback;
    }
    case "ADS_GENERATE":
    case "ADS_PHOTOSHOOT": {
      const images = len(output.images ?? output.assets);
      return images ? `${images} image${images === 1 ? "" : "s"}` : fallback;
    }
    case "ADS_FORECAST": {
      const scenarios = len(output.scenarios);
      return scenarios ? `${scenarios} scenarios` : fallback;
    }
    case "ADS_TEST": {
      const variants = len(output.variants);
      const sample = typeof output.minSampleSize === "number" ? `n=${output.minSampleSize}` : null;
      const parts = [variants ? `${variants} variants` : null, sample].filter(Boolean);
      return parts.length ? parts.join(N_DASH) : fallback;
    }
    case "ADS_AUDIT": {
      const score = typeof output.score === "number" ? output.score : null;
      const findings = len(output.findings);
      const parts = [
        score !== null ? `score ${score}` : null,
        findings ? `${findings} finding${findings === 1 ? "" : "s"}` : null,
      ].filter(Boolean);
      return parts.length ? parts.join(N_DASH) : fallback;
    }
    case "ADS_CREATIVE":
    case "ADS_LANDING":
    case "ADS_GOOGLE":
    case "ADS_META":
    case "ADS_TIKTOK":
    case "ADS_LINKEDIN":
    case "ADS_MICROSOFT":
    case "ADS_YOUTUBE":
    case "ADS_APPLE": {
      const score = typeof output.score === "number" ? output.score : null;
      const findings = len(output.findings);
      const parts = [
        score !== null ? `score ${score}` : null,
        findings ? `${findings} finding${findings === 1 ? "" : "s"}` : null,
      ].filter(Boolean);
      return parts.length ? parts.join(N_DASH) : fallback;
    }
    default:
      return fallback;
  }
}

/**
 * Turn agent error strings into something readable in the monitor.
 *
 * Handles the three shapes we actually see in production today:
 *  1. Zod issues array — `[{"validation":"url","code":"invalid_string","message":"Invalid url","path":["domain"]}]`
 *  2. JSON parse failures — `JSON parse failed: Expected ',' or '}' after property value in JSON at position 6710`
 *  3. Anthropic 401 — `401 {"type":"error",...}`
 */
export function formatRunError(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  const s = raw.trim();

  // 1. Zod issues array
  if (s.startsWith("[") && s.includes('"validation"')) {
    try {
      const parsed = JSON.parse(s) as Array<{ message?: string; path?: (string | number)[] }>;
      const lines = parsed.map((i) => {
        const path = (i.path ?? []).join(".") || "input";
        return `${path}: ${i.message ?? "invalid"}`;
      });
      return lines.join("; ").slice(0, 160);
    } catch {
      // fall through
    }
  }

  // 2. JSON parse failure (truncation) — keep the human prefix, drop the position math
  if (s.startsWith("JSON parse failed:")) {
    if (s.includes("Unterminated string") || s.includes("Expected ','") || s.includes("Expected '}'")) {
      return "Response was truncated mid-JSON — retried automatically; this row predates the retry";
    }
    return "Malformed JSON response from the model";
  }

  // 3. Anthropic-style "401 {...}" — extract the embedded message
  const httpMatch = s.match(/^\d{3}\s+(\{.+\})$/);
  if (httpMatch) {
    try {
      const obj = JSON.parse(httpMatch[1]) as { error?: { message?: string } };
      if (obj.error?.message) return `API error: ${obj.error.message}`;
    } catch {
      // fall through
    }
  }

  // 4. Generic — first line, capped
  return s.split("\n")[0].slice(0, 160);
}
