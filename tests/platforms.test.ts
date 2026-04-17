import { describe, it, expect } from "vitest";
import { PLATFORM_META, platformClass, platformLabel, platformColor } from "@/lib/platforms";

describe("platform registry", () => {
  it("exposes all 7 platforms", () => {
    const keys = Object.keys(PLATFORM_META);
    expect(keys).toEqual(["meta", "google", "tiktok", "linkedin", "microsoft", "youtube", "apple"]);
  });

  it("maps human labels correctly", () => {
    expect(platformLabel("meta")).toBe("Meta");
    expect(platformLabel("META")).toBe("Meta");
    expect(platformLabel("unknown")).toBe("unknown");
  });

  it("returns a .pf-* class for a known platform", () => {
    expect(platformClass("tiktok")).toBe("pf-tiktok");
    expect(platformClass("TikTok")).toBe("pf-tiktok");
  });

  it("returns an HSL string for recharts", () => {
    const c = platformColor("meta");
    expect(c.startsWith("hsl(")).toBe(true);
    expect(c.endsWith(")")).toBe(true);
  });

  it("falls back to primary for unknown platforms", () => {
    expect(platformColor("metaverse" as string)).toContain("var(--primary)");
  });
});
