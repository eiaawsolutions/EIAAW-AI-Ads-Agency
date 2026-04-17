import { describe, it, expect, beforeAll } from "vitest";
import { encryptSecret, decryptSecret, verifyCrypto } from "@/lib/crypto";

beforeAll(() => {
  // Deterministic key for tests.
  process.env.EIAAW_ENCRYPTION_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});

describe("crypto (AES-256-GCM)", () => {
  it("round-trips a short string", () => {
    const out = decryptSecret(encryptSecret("hello"));
    expect(out).toBe("hello");
  });

  it("round-trips a realistic OAuth token", () => {
    const token = "EAAG" + "a".repeat(200) + "Z";
    expect(decryptSecret(encryptSecret(token))).toBe(token);
  });

  it("produces different ciphertext for same input (random nonce)", () => {
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same");
    expect(decryptSecret(b)).toBe("same");
  });

  it("carries version prefix", () => {
    expect(encryptSecret("x")).toMatch(/^v1:/);
  });

  it("passes the built-in self-test", () => {
    expect(() => verifyCrypto()).not.toThrow();
  });

  it("treats unversioned value as legacy plaintext", () => {
    expect(decryptSecret("legacy-plaintext")).toBe("legacy-plaintext");
  });

  it("rejects tampered ciphertext", () => {
    const enc = encryptSecret("secret");
    const tampered = enc.slice(0, -5) + "AAAAA";
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("handles empty string", () => {
    expect(encryptSecret("")).toBe("");
    expect(decryptSecret("")).toBe("");
  });
});
