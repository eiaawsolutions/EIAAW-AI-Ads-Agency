import { describe, it, expect } from "vitest";
import { adsMath } from "@/agents/strategy/ads-math";

describe("adsMath agent — deterministic forecaster", () => {
  const ctx = {
    orgId: "test-org",
    executionMode: "ASSISTED" as const,
  };

  it("produces three labeled scenarios", async () => {
    const res = await (adsMath.run as (c: typeof ctx, i: unknown) => ReturnType<typeof adsMath.run>)(ctx, { monthlyBudgetUsd: 5000 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.output?.scenarios).toHaveLength(3);
    expect(res.output?.scenarios.map((s) => s.label)).toEqual([
      "Conservative",
      "Moderate",
      "Aggressive",
    ]);
  });

  it("ROAS scales linearly with the multiplier", async () => {
    const res = await (adsMath.run as (c: typeof ctx, i: unknown) => ReturnType<typeof adsMath.run>)(ctx, { monthlyBudgetUsd: 1000 });
    expect(res.ok).toBe(true);
    if (!res.ok || !res.output) return;
    const [cons, mod, agg] = res.output.scenarios;
    expect(cons.roas).toBeLessThan(mod.roas);
    expect(mod.roas).toBeLessThan(agg.roas);
  });

  it("CPA moves inversely to multiplier (fewer clicks → higher CPA)", async () => {
    const res = await (adsMath.run as (c: typeof ctx, i: unknown) => ReturnType<typeof adsMath.run>)(ctx, { monthlyBudgetUsd: 1000 });
    expect(res.ok).toBe(true);
    if (!res.ok || !res.output) return;
    const [cons, mod, agg] = res.output.scenarios;
    expect(cons.cpa).toBeGreaterThan(mod.cpa);
    expect(mod.cpa).toBeGreaterThan(agg.cpa);
  });

  it("spend is invariant across scenarios (budget is fixed)", async () => {
    const res = await (adsMath.run as (c: typeof ctx, i: unknown) => ReturnType<typeof adsMath.run>)(ctx, { monthlyBudgetUsd: 7500 });
    if (!res.ok || !res.output) return;
    for (const s of res.output.scenarios) expect(s.spend).toBe(7500);
  });

  it("reports zero token usage (no LLM involvement)", async () => {
    const res = await (adsMath.run as (c: typeof ctx, i: unknown) => ReturnType<typeof adsMath.run>)(ctx, { monthlyBudgetUsd: 1000 });
    expect(res.tokensIn).toBe(0);
    expect(res.tokensOut).toBe(0);
    expect(res.costUsd).toBe(0);
  });

  it("validates negative budget", () => {
    expect(() =>
      (adsMath.validate as unknown as (i: { monthlyBudgetUsd: number }) => void)({
        monthlyBudgetUsd: -1,
      }),
    ).toThrow();
  });
});
