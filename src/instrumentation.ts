/**
 * Next.js boot hook. Runs once when the server starts (before the first
 * request is handled). Used to resolve Infisical `secret://...` handles
 * into real values in process.env so the rest of the app sees concrete
 * secrets via plain process.env.<NAME> access.
 *
 * Edge runtime is deliberately skipped — only nodejs runtime can hit
 * Infisical's HTTP API and mutate process.env. Edge requests already
 * see the resolved values because resolution happens at startup, not
 * per-request.
 */
// Build marker — bump to force image rebuild after dedup.
const BUILD_MARKER = "2026-05-01T05:40Z-src-move";

export async function register() {
  // eslint-disable-next-line no-console
  console.log(
    `[instrumentation] hook fired build=${BUILD_MARKER} runtime=${process.env.NEXT_RUNTIME ?? "unset"} resolver=${process.env.INFISICAL_RESOLVER_ENABLED ?? "unset"}`,
  );

  // In Next.js 15 standalone, NEXT_RUNTIME is sometimes unset on the
  // node-server boot path. Treat anything that isn't explicitly "edge"
  // as nodejs so the resolver still runs.
  if (process.env.NEXT_RUNTIME === "edge") return;

  // Lazy import so the edge bundle never tries to load the SDK.
  const { resolveEnvFromInfisical } = await import("./lib/secrets");

  try {
    const result = await resolveEnvFromInfisical();
    if (result.resolved.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[infisical] resolved ${result.resolved.length} secret(s) at boot: ${result.resolved.join(", ")}`,
      );
    } else if (process.env.INFISICAL_RESOLVER_ENABLED === "true") {
      // eslint-disable-next-line no-console
      console.log("[infisical] resolver enabled but no secret:// handles found in env.");
    }
  } catch (err) {
    // Fail loud at boot — a missing secret is better caught here than
    // 500ing every request later. Railway will mark the deploy failed.
    // eslint-disable-next-line no-console
    console.error("[infisical] boot resolver failed:", err);
    throw err;
  }
}
