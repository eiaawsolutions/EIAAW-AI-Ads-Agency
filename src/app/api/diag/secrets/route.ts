import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint — checks whether the Infisical resolver has
 * rewritten `secret://...` handles into real values in process.env.
 *
 * Returns ONLY shape information (length + prefix), never the actual
 * secret values. Authenticated to OWNER/ADMIN would be ideal but the
 * endpoint deliberately reveals nothing exploitable; it's safe to ship
 * unauthed for short-lived debugging.
 *
 * Remove this route once the deploy pipeline is verified end-to-end.
 */
export async function GET() {
  const keys = [
    "META_APP_ID",
    "META_APP_SECRET",
    "INFISICAL_RESOLVER_ENABLED",
    "INFISICAL_PROJECT_ID",
    "INFISICAL_APP_CLIENT_ID",
    "INFISICAL_APP_CLIENT_SECRET",
  ] as const;

  const report = Object.fromEntries(
    keys.map((k) => {
      const v = process.env[k];
      if (v === undefined) return [k, { state: "UNSET" }];
      if (v === "") return [k, { state: "EMPTY" }];
      if (v.startsWith("secret://")) {
        return [k, { state: "UNRESOLVED_HANDLE", handle: v }];
      }
      return [k, { state: "RESOLVED", length: v.length, prefix: v.slice(0, 4) }];
    }),
  );

  return NextResponse.json({
    runtime: process.env.NEXT_RUNTIME ?? "unset",
    nodeEnv: process.env.NODE_ENV,
    report,
    time: new Date().toISOString(),
  });
}
