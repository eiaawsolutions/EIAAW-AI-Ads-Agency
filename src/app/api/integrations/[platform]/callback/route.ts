import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getAdapter } from "@/integrations/registry";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { enqueueAuditFor } from "@/jobs/audit-trigger";
import { resolveAuthedOrg } from "@/lib/resolve-org";

export async function GET(req: Request, ctx: { params: Promise<{ platform: string }> }) {
  // Reject prefetches and link-preview crawlers. The OAuth callback has a
  // real DB side effect (upserts a connected Integration row), so any GET
  // that wasn't a deliberate user action must not execute. Without this,
  // Next.js's <Link> prefetcher and Slack/Discord/Twitter unfurl bots can
  // silently re-create connected rows after a Disconnect.
  const secPurpose = req.headers.get("sec-purpose") ?? req.headers.get("purpose");
  const nextPrefetch = req.headers.get("next-router-prefetch") ?? req.headers.get("x-middleware-prefetch");
  if (secPurpose?.includes("prefetch") || nextPrefetch) {
    return new NextResponse(null, { status: 204 });
  }

  const orgCtx = await resolveAuthedOrg();
  if (!orgCtx) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin`);
  const { orgId, userId } = orgCtx;

  // IP-scoped rate limit to prevent OAuth code-stuffing brute force.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const limited = await rateLimit(`oauth-cb:${ip}`, { limit: 20, windowSec: 60 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const { platform } = await ctx.params;
  const p = platform.toUpperCase() as Platform;
  if (!(p in Platform)) return NextResponse.json({ error: "Unknown platform" }, { status: 400 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${platform}/callback`;
  const token = await getAdapter(p).exchangeCode(code, redirectUri);

  // Encrypt tokens at rest — AES-256-GCM, `v1:` prefix for future rotation.
  const accessEnc = encryptSecret(token.accessToken);
  const refreshEnc = token.refreshToken ? encryptSecret(token.refreshToken) : null;

  await db.integration.upsert({
    where: {
      orgId_platform_externalId: {
        orgId,
        platform: p,
        externalId: token.externalId ?? "default",
      },
    },
    update: {
      accessToken: accessEnc,
      refreshToken: refreshEnc,
      expiresAt: token.expiresAt,
      scopes: token.scopes,
      status: "connected",
    },
    create: {
      orgId,
      platform: p,
      externalId: token.externalId ?? "default",
      displayName: token.displayName,
      accessToken: accessEnc,
      refreshToken: refreshEnc,
      expiresAt: token.expiresAt,
      scopes: token.scopes,
      status: "connected",
    },
  });

  // Live mode only: pull last 30 days of real Insights so the audit has
  // grounded numbers instead of zeros. Best-effort: a platform hiccup here
  // must not turn a successful OAuth into a redirect failure.
  if (p === Platform.META && getAdapter(p).mode === "live") {
    const { ingestMetaInsights } = await import("@/integrations/meta/insights");
    ingestMetaInsights({ orgId, accessToken: token.accessToken, days: 30 })
      .then((r) =>
        console.log(
          `[meta-insights:connect] org=${orgId} acct=${r.adAccountId} rows=${r.rowsUpserted} spendMinor=${r.totalSpendMinor}`,
        ),
      )
      .catch((err) =>
        console.warn(
          `[meta-insights:connect] org=${orgId} ingest failed:`,
          err instanceof Error ? err.message : err,
        ),
      );
  }

  if (p === Platform.GOOGLE && getAdapter(p).mode === "live") {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
    if (developerToken && token.externalId) {
      const { ingestGoogleAdsInsights } = await import("@/integrations/google/insights");
      ingestGoogleAdsInsights({
        orgId,
        accessToken: token.accessToken,
        developerToken,
        customerId: token.externalId,
        loginCustomerId,
        days: 30,
      })
        .then((r) =>
          console.log(
            `[google-insights:connect] org=${orgId} cid=${r.customerId} rows=${r.rowsUpserted} spendMinor=${r.totalSpendMinor}`,
          ),
        )
        .catch((err) =>
          console.warn(
            `[google-insights:connect] org=${orgId} ingest failed:`,
            err instanceof Error ? err.message : err,
          ),
        );
    }
  }

  // Auto-trigger an audit on platform connect. Best-effort and non-blocking:
  // the 24h dedup floor in enqueueAuditFor handles reconnect loops, and any
  // failure here must not turn a successful OAuth into a redirect error.
  enqueueAuditFor(orgId, "connect", { actorId: userId }).catch((err) => {
    console.warn("[audit-trigger:connect] enqueue failed:", err instanceof Error ? err.message : err);
  });

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?connected=${platform}`,
  );
}
