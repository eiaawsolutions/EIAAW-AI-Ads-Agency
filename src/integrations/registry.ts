import { Platform } from "@prisma/client";
import type { PlatformAdapter } from "./types";

import { metaAdapter } from "./meta-adapter";
import { googleAdapter } from "./google";
import { tiktokAdapter } from "./tiktok";
import { linkedinAdapter } from "./linkedin";
import { microsoftAdapter } from "./microsoft";
import { youtubeAdapter } from "./youtube";
import { appleAdapter } from "./apple";

const adapters: Record<Platform, PlatformAdapter> = {
  META: metaAdapter,
  GOOGLE: googleAdapter,
  TIKTOK: tiktokAdapter,
  LINKEDIN: linkedinAdapter,
  MICROSOFT: microsoftAdapter,
  YOUTUBE: youtubeAdapter,
  APPLE: appleAdapter,
};

export function getAdapter(platform: Platform): PlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) throw new Error(`No adapter for platform ${platform}`);
  return adapter;
}

export const allPlatforms: Platform[] = Object.values(Platform);
