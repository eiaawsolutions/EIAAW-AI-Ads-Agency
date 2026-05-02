import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { resolveOrgId } from "@/lib/resolve-org";
import { rateLimit } from "@/lib/rate-limit";
import { loadTokens } from "@/integrations/token-store";
import { MetaClient } from "@/integrations/meta/client";
import { MetaApiError } from "@/integrations/meta/errors";

/**
 * POST /api/meta/upload-image
 *
 * Body: multipart/form-data with field `file` = image (jpeg/png/gif/webp).
 *
 * Uploads to Meta /act_X/adimages and returns the image_hash that ad
 * creatives reference via object_story_spec.link_data.image_hash.
 *
 * Returns: { ok: true, hash, url, filename }
 *      or: { ok: false, error }
 *
 * Limits: 30 MB per image (Meta's hard cap is ~30 MB; we mirror it so the
 * Graph API doesn't waste a roundtrip on payloads it'll reject).
 */

const MAX_BYTES = 30 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function POST(req: Request) {
  const ctx = await resolveOrgId();
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const limited = await rateLimit(`meta-upload:${ctx.orgId}`, { limit: 30, windowSec: 3600 });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: `Upload rate limit exceeded. Retry in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const tokens = await loadTokens(ctx.orgId, Platform.META);
  if (!tokens?.plainAccessToken || !tokens.externalId) {
    return NextResponse.json(
      { ok: false, error: "Meta is not connected.", requiresReconnect: true },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "expected multipart/form-data body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "missing 'file' field" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: `image too large (${Math.round(file.size / 1024 / 1024)} MB) — max 30 MB` },
      { status: 413 },
    );
  }

  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { ok: false, error: `unsupported image type ${file.type} — use JPEG/PNG/GIF/WEBP` },
      { status: 415 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const filename = file.name || `upload-${Date.now()}.jpg`;

  const client = new MetaClient({ accessToken: tokens.plainAccessToken });
  try {
    const { hash, url } = await client.uploadImage(tokens.externalId, { bytes, filename });
    return NextResponse.json({ ok: true, hash, url, filename });
  } catch (err) {
    if (err instanceof MetaApiError) {
      const detail = err.raw.error_user_msg ?? err.message;
      console.error(
        `[META] uploadImage failed: code=${err.code} subcode=${err.subcode ?? "-"} ` +
          `category=${err.category} fbtrace=${err.fbtraceId} userMsg=${JSON.stringify(detail)}`,
      );
      return NextResponse.json({ ok: false, error: `(#${err.code}) ${detail}` }, { status: 400 });
    }
    console.error("[META] uploadImage unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "upload failed" },
      { status: 500 },
    );
  }
}
