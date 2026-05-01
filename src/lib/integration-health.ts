export type TokenHealth = "healthy" | "expiring_soon" | "expired" | "no_expiry";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1_000;

/**
 * Classify an OAuth token's expiry posture for UI display.
 *
 *  - "expired"        : expiresAt is in the past
 *  - "expiring_soon"  : expires within the next 7 days
 *  - "healthy"        : expires after 7 days
 *  - "no_expiry"      : no expiresAt set (rare; some platforms issue
 *                       non-expiring tokens for confidential clients)
 *
 * Status string is purely informational — the platform's API will
 * return its own auth error if a token is actually invalid; this is
 * just so we can warn the user before that happens.
 */
export function tokenHealth(expiresAt: Date | null | undefined, now = new Date()): TokenHealth {
  if (!expiresAt) return "no_expiry";
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return "expired";
  if (ms <= SEVEN_DAYS_MS) return "expiring_soon";
  return "healthy";
}

/**
 * Human-readable "expires in 3d" / "expired 2h ago" string for the UI.
 * Returns null for healthy or no-expiry tokens — the UI hides the
 * indicator entirely in those cases.
 */
export function tokenHealthLabel(
  expiresAt: Date | null | undefined,
  now = new Date(),
): string | null {
  const health = tokenHealth(expiresAt, now);
  if (health === "healthy" || health === "no_expiry" || !expiresAt) return null;

  const diffMs = expiresAt.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const days = Math.floor(absMs / 86_400_000);
  const hours = Math.floor((absMs % 86_400_000) / 3_600_000);

  if (health === "expired") {
    if (days >= 1) return `expired ${days}d ago`;
    if (hours >= 1) return `expired ${hours}h ago`;
    return "expired";
  }
  // expiring_soon
  if (days >= 1) return `expires in ${days}d`;
  if (hours >= 1) return `expires in ${hours}h`;
  return "expires soon";
}
