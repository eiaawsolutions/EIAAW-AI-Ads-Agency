import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getAdapter } from "@/integrations/registry";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin`);

  const userId = (session.user as { id: string }).id;

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

  const membership = await db.membership.findFirst({ where: { userId } });
  if (!membership) return NextResponse.json({ error: "No org" }, { status: 400 });

  // Encrypt tokens at rest — AES-256-GCM, `v1:` prefix for future rotation.
  const accessEnc = encryptSecret(token.accessToken);
  const refreshEnc = token.refreshToken ? encryptSecret(token.refreshToken) : null;

  await db.integration.upsert({
    where: {
      orgId_platform_externalId: {
        orgId: membership.orgId,
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
      orgId: membership.orgId,
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

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?connected=${platform}`,
  );
}
