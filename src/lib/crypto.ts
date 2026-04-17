import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM envelope encryption for secrets stored in the database.
 * Primary use: Integration.accessToken / refreshToken — OAuth tokens
 * must never be readable from a DB dump alone.
 *
 * Key source: EIAAW_ENCRYPTION_KEY env var (64-char hex = 32 bytes).
 * Fallback key derives from AUTH_SECRET for dev convenience only;
 * production MUST set EIAAW_ENCRYPTION_KEY.
 *
 * Wire format:  base64(nonce(12) || ciphertext || authTag(16))
 * Version prefix `v1:` lets us rotate the scheme without migrating rows.
 */

const VERSION = "v1";

function resolveKey(): Buffer {
  const raw = process.env.EIAAW_ENCRYPTION_KEY;
  if (raw && /^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  // Dev fallback: SHA-256(AUTH_SECRET). Deterministic within an env.
  const seed = process.env.AUTH_SECRET;
  if (!seed) {
    throw new Error("EIAAW_ENCRYPTION_KEY or AUTH_SECRET must be set for encryption");
  }
  return createHash("sha256").update(seed).digest();
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  const key = resolveKey();
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const envelope = Buffer.concat([nonce, enc, tag]).toString("base64");
  return `${VERSION}:${envelope}`;
}

export function decryptSecret(ciphertext: string): string {
  if (!ciphertext) return "";
  const [version, payload] = ciphertext.split(":", 2);
  if (version !== VERSION || !payload) {
    // Unencrypted legacy value — return as-is during transition.
    return ciphertext;
  }
  const key = resolveKey();
  const buf = Buffer.from(payload, "base64");
  const nonce = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const enc = buf.subarray(12, buf.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

/** Helper: round-trip safety check — throws if the pair doesn't match. */
export function verifyCrypto(): void {
  const sample = "eiaaw-crypto-probe-" + Date.now();
  const round = decryptSecret(encryptSecret(sample));
  if (round !== sample) throw new Error("Crypto self-test failed");
}
