import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getAdapter } from "@/integrations/registry";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin`);

  const userId = (session.user as { id: string }).id;
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

  await db.integration.upsert({
    where: { orgId_platform_externalId: { orgId: membership.orgId, platform: p, externalId: token.externalId ?? "default" } },
    update: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      scopes: token.scopes,
      status: "connected",
    },
    create: {
      orgId: membership.orgId,
      platform: p,
      externalId: token.externalId ?? "default",
      displayName: token.displayName,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      scopes: token.scopes,
      status: "connected",
    },
  });

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?connected=${platform}`);
}
