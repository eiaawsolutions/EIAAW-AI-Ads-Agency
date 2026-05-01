import type { Platform } from "@prisma/client";
import type { AgentContext } from "@/agents/types";

export type IntegrationAction = "launch" | "pause" | "optimize" | "sync_metrics";

export type IntegrationInput = {
  action: IntegrationAction;
  campaignId?: string;
  payload?: Record<string, unknown>;
};

export type IntegrationResult = {
  action: IntegrationAction;
  externalIds?: Record<string, string>;
  metrics?: Record<string, number>;
  log?: string[];
};

export interface PlatformAdapter {
  platform: Platform;
  /**
   * "live" when real OAuth credentials are configured (provider-specific
   * env vars present); "stub" when running against the simulated adapter.
   * The connect route uses this to decide whether to redirect to the real
   * OAuth provider or shortcut through the in-app callback for the demo.
   */
  mode: "live" | "stub";
  /** Generate the OAuth authorization URL for this platform. */
  authUrl(redirectUri: string, state: string): string;
  /** Exchange an OAuth code for access + refresh tokens. */
  exchangeCode(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scopes: string[];
    externalId?: string;
    displayName?: string;
  }>;
  /** Execute a platform operation. Throws on unrecoverable errors. */
  execute(ctx: AgentContext, input: IntegrationInput): Promise<IntegrationResult>;
}

export class NotImplementedError extends Error {
  constructor(platform: Platform, feature: string) {
    super(`[${platform}] ${feature} is not implemented. See src/integrations/${platform.toLowerCase()}.ts TODOs.`);
  }
}
