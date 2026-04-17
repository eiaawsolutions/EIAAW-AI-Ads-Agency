import { describe, it, expect } from "vitest";
import { DAILY_CAP_USD, isCapOverride } from "@/lib/cost-caps";

describe("cost-caps", () => {
  it("defines caps for all three plans", () => {
    expect(DAILY_CAP_USD.STARTER).toBeGreaterThan(0);
    expect(DAILY_CAP_USD.GROWTH).toBeGreaterThan(DAILY_CAP_USD.STARTER);
    expect(DAILY_CAP_USD.ENTERPRISE).toBeGreaterThan(DAILY_CAP_USD.GROWTH);
  });

  it("rejects override when env secret is not set", () => {
    delete process.env.EIAAW_COST_OVERRIDE_SECRET;
    expect(isCapOverride("anything")).toBe(false);
  });

  it("rejects override shorter than 16 chars", () => {
    process.env.EIAAW_COST_OVERRIDE_SECRET = "short";
    expect(isCapOverride("short")).toBe(false);
  });

  it("accepts matching override with 16+ char secret", () => {
    process.env.EIAAW_COST_OVERRIDE_SECRET = "a-sufficiently-long-secret-value";
    expect(isCapOverride("a-sufficiently-long-secret-value")).toBe(true);
    expect(isCapOverride("wrong")).toBe(false);
    expect(isCapOverride(null)).toBe(false);
  });
});
