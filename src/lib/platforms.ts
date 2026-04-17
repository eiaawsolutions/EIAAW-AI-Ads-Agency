/**
 * Per-platform identity: brand color (HSL triplet for CSS vars), short code,
 * label, and Tailwind class prefix. Single source of truth for anywhere
 * that renders a platform-aware surface (chips, bars, dots, table rows).
 */

export type PlatformKey =
  | "meta" | "google" | "tiktok" | "linkedin" | "microsoft" | "youtube" | "apple";

export const PLATFORM_META: Record<PlatformKey, {
  code: string;       // short 4-letter token code for dense displays
  label: string;      // human label
  cssVar: string;     // matches globals.css --platform-*
  className: string;  // .pf-* class that sets --pf
}> = {
  meta:      { code: "META", label: "Meta",      cssVar: "var(--platform-meta)",      className: "pf-meta" },
  google:    { code: "GOOG", label: "Google",    cssVar: "var(--platform-google)",    className: "pf-google" },
  tiktok:    { code: "TTOK", label: "TikTok",    cssVar: "var(--platform-tiktok)",    className: "pf-tiktok" },
  linkedin:  { code: "LNKD", label: "LinkedIn",  cssVar: "var(--platform-linkedin)",  className: "pf-linkedin" },
  microsoft: { code: "MSFT", label: "Microsoft", cssVar: "var(--platform-microsoft)", className: "pf-microsoft" },
  youtube:   { code: "YTUB", label: "YouTube",   cssVar: "var(--platform-youtube)",   className: "pf-youtube" },
  apple:     { code: "APPL", label: "Apple",     cssVar: "var(--platform-apple)",     className: "pf-apple" },
};

export function platformClass(key: string): string {
  const k = key.toLowerCase() as PlatformKey;
  return PLATFORM_META[k]?.className ?? "";
}

export function platformLabel(key: string): string {
  const k = key.toLowerCase() as PlatformKey;
  return PLATFORM_META[k]?.label ?? key;
}

/** HSL color string suitable for recharts / inline SVG. */
export function platformColor(key: string): string {
  const k = key.toLowerCase() as PlatformKey;
  const css = PLATFORM_META[k]?.cssVar;
  if (!css) return "hsl(var(--primary))";
  return `hsl(${css.replace("var(", "").replace(")", "")})`;
}
