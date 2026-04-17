import type { Platform } from "@prisma/client";
import type { PlatformAdapter, IntegrationResult } from "./types";

/**
 * Returns an adapter that simulates success with realistic-looking
 * randomized metrics. Used for every platform until real API wiring lands.
 */
export function stubAdapter(platform: Platform, authBase: string): PlatformAdapter {
  return {
    platform,
    authUrl(redirectUri, state) {
      const params = new URLSearchParams({ redirect_uri: redirectUri, state, response_type: "code" });
      return `${authBase}?${params.toString()}`;
    },
    async exchangeCode() {
      return {
        accessToken: `stub_${platform}_${Date.now()}`,
        refreshToken: `stub_refresh_${platform}`,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
        scopes: ["ads_read", "ads_management"],
        externalId: `acct_${platform.toLowerCase()}_${Math.random().toString(36).slice(2, 10)}`,
        displayName: `${platform} (sandbox)`,
      };
    },
    async execute(_ctx, input): Promise<IntegrationResult> {
      const log = [`[${platform}] action=${input.action} received`];
      if (input.action === "sync_metrics") {
        return {
          action: input.action,
          metrics: {
            impressions: 8000 + Math.round(Math.random() * 12000),
            clicks: 120 + Math.round(Math.random() * 180),
            conversions: 4 + Math.round(Math.random() * 12),
            spend: 40000 + Math.round(Math.random() * 60000),
            revenue: 120000 + Math.round(Math.random() * 200000),
          },
          log,
        };
      }
      if (input.action === "launch") {
        return {
          action: input.action,
          externalIds: {
            campaign: `${platform.toLowerCase()}_cmp_${Math.random().toString(36).slice(2, 10)}`,
            adSet: `${platform.toLowerCase()}_as_${Math.random().toString(36).slice(2, 10)}`,
          },
          log: [...log, `[${platform}] launched campaign (stub)`],
        };
      }
      return { action: input.action, log };
    },
  };
}
