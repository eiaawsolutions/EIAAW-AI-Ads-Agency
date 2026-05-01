import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getAdapter } from "@/integrations/registry";
import { auth } from "@/lib/auth";

/**
 * Kicks off OAuth. Behavior depends on adapter mode:
 *
 *  - mode="live"  → 302 to the platform's OAuth dialog
 *  - mode="stub"  → 302 to our own /callback?code=stub_<plat> so the demo
 *                   experience completes without real credentials. The
 *                   stub callback creates a real Integration row with a
 *                   sandbox displayName, which is enough to unlock the
 *                   audit milestone in onboarding.
 *
 * State should ideally be persisted in a short-lived signed cookie for
 * CSRF protection on real OAuth providers. The stub flow doesn't need
 * it (request stays on our origin).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin`);
  }

  const { platform } = await ctx.params;
  const p = platform.toUpperCase() as Platform;
  if (!(p in Platform)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  const adapter = getAdapter(p);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const callbackPath = `/api/integrations/${platform}/callback`;
  const redirectUri = `${base}${callbackPath}`;
  const state = crypto.randomUUID();

  if (adapter.mode === "stub") {
    // Skip the round-trip to a non-existent OAuth dialog. Send the user
    // straight to our callback with a deterministic stub code; the
    // adapter's exchangeCode returns sandbox tokens.
    return NextResponse.redirect(
      `${base}${callbackPath}?code=stub_${platform}_${Date.now()}&state=${state}`,
    );
  }

  return NextResponse.redirect(adapter.authUrl(redirectUri, state));
}
