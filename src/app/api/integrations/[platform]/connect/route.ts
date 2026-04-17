import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getAdapter } from "@/integrations/registry";
import { auth } from "@/lib/auth";

/**
 * Kicks off OAuth. Returns the auth URL — the frontend redirects.
 * Real implementations should persist `state` in a short-lived signed cookie
 * to guard against CSRF at the callback.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform } = await ctx.params;
  const p = platform.toUpperCase() as Platform;
  if (!(p in Platform)) return NextResponse.json({ error: "Unknown platform" }, { status: 400 });

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${platform}/callback`;
  const state = crypto.randomUUID();
  const url = getAdapter(p).authUrl(redirectUri, state);
  return NextResponse.json({ url, state });
}
