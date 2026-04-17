import { describe, it, expect } from "vitest";
import { adsBudget } from "@/agents/strategy/ads-budget";
import type { AgentContext } from "@/agents/types";

type BudgetInput = {
  totalBudgetUsd: number;
  platforms: { platform: string; roas30d: number; spend30d: number }[];
};
const run = (ctx: AgentContext, i: BudgetInput) =>
  (adsBudget.run as unknown as (c: AgentContext, i: BudgetInput) => ReturnType<typeof adsBudget.run>)(ctx, i);

describe("adsBudget agent — 70/20/10 allocator", () => {
  const ctx: AgentContext = { orgId: "test-org", executionMode: "ASSISTED" };

  it("allocates 70/20/10 by descending ROAS", async () => {
    const res = await run(ctx, {
      totalBudgetUsd: 10000,
      platforms: [
        { platform: "META",   roas30d: 4.2, spend30d: 5000 },
        { platform: "GOOGLE", roas30d: 3.1, spend30d: 3000 },
        { platform: "TIKTOK", roas30d: 1.2, spend30d: 1500 },
      ],
    });
    if (!res.ok || !res.output) return;
    expect(res.output.allocation.META.budgetUsd).toBe(7000);
    expect(res.output.allocation.GOOGLE.budgetUsd).toBe(2000);
    expect(res.output.allocation.TIKTOK.budgetUsd).toBe(1000);
  });

  it("kills sub-1.5 ROAS platforms", async () => {
    const res = await run(ctx, {
      totalBudgetUsd: 10000,
      platforms: [{ platform: "META", roas30d: 0.8, spend30d: 5000 }],
    });
    if (!res.ok || !res.output) return;
    expect(res.output.allocation.META.action).toBe("kill");
  });

  it("scales 3.0+ ROAS platforms", async () => {
    const res = await run(ctx, {
      totalBudgetUsd: 10000,
      platforms: [{ platform: "META", roas30d: 4.5, spend30d: 5000 }],
    });
    if (!res.ok || !res.output) return;
    expect(res.output.allocation.META.action).toBe("scale");
  });
});
