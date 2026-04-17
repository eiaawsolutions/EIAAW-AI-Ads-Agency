import type { Integration, Platform } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

/**
 * Read-side helper: fetch an Integration row and transparently decrypt
 * its OAuth tokens. Adapters should use this instead of reading
 * Integration.accessToken directly.
 */
export async function loadTokens(orgId: string, platform: Platform): Promise<
  | (Integration & { plainAccessToken: string; plainRefreshToken: string | null })
  | null
> {
  const row = await db.integration.findFirst({
    where: { orgId, platform, status: "connected" },
    orderBy: { updatedAt: "desc" },
  });
  if (!row) return null;
  return {
    ...row,
    plainAccessToken: row.accessToken ? decryptSecret(row.accessToken) : "",
    plainRefreshToken: row.refreshToken ? decryptSecret(row.refreshToken) : null,
  };
}

/** Write-side helper: persist new tokens after a refresh, encrypting first. */
export async function saveRefreshedTokens(args: {
  orgId: string;
  platform: Platform;
  externalId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}) {
  return db.integration.update({
    where: {
      orgId_platform_externalId: {
        orgId: args.orgId,
        platform: args.platform,
        externalId: args.externalId,
      },
    },
    data: {
      accessToken: encryptSecret(args.accessToken),
      refreshToken: args.refreshToken ? encryptSecret(args.refreshToken) : undefined,
      expiresAt: args.expiresAt,
      status: "connected",
    },
  });
}
