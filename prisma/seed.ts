import { PrismaClient, Plan, Role, Platform, CampaignObjective, CampaignStatus, ExperimentStatus } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const org = await db.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { slug: "demo", name: "Demo Brand Co.", plan: Plan.GROWTH },
  });

  const user = await db.user.upsert({
    where: { email: "demo@eiaaw.ai" },
    update: {},
    create: { email: "demo@eiaaw.ai", name: "Demo User" },
  });

  await db.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: {},
    create: { userId: user.id, orgId: org.id, role: Role.OWNER },
  });

  const brand = await db.brand.upsert({
    where: { id: "seed-brand" },
    update: {},
    create: {
      id: "seed-brand",
      orgId: org.id,
      name: "Aurora Skincare",
      domain: "aurora.example.com",
    },
  });

  await db.brandDna.upsert({
    where: { brandId: brand.id },
    update: {},
    create: {
      brandId: brand.id,
      businessGoals: ["sales", "retention"],
      valueProps: ["Clinical-grade formulas", "Vegan", "30-day results"],
      positioning: "Dermatologist-backed skincare for sensitive skin.",
      personas: [{ name: "Wellness Sara", age: "28-40", channels: ["IG", "TikTok"] }],
      markets: ["US", "CA", "MY"],
      toneOfVoice: { pillars: ["calm", "credible", "modern"], banned: ["miracle", "cure"] },
      colorPalette: { primary: "#14B39B", secondary: "#083C3C", accent: "#5DDECA" },
      typography: { display: "Inter", body: "Inter" },
      budgetMin: 500000,
      budgetMax: 2500000,
      currency: "USD",
      targetCpa: 22,
      targetRoas: 3.5,
      targetCtr: 1.4,
    },
  });

  const campaign = await db.campaign.upsert({
    where: { id: "seed-campaign" },
    update: {},
    create: {
      id: "seed-campaign",
      orgId: org.id,
      brandId: brand.id,
      name: "Q2 Spring Launch",
      objective: CampaignObjective.SALES,
      platforms: [Platform.META, Platform.GOOGLE, Platform.TIKTOK],
      status: CampaignStatus.LIVE,
      dailyBudget: 50000,
      strategy: {
        funnel: { tof: 0.5, mof: 0.3, bof: 0.2 },
        allocation: { META: 0.45, GOOGLE: 0.35, TIKTOK: 0.2 },
        kpis: { targetCpa: 22, targetRoas: 3.5 },
      },
    },
  });

  // 30 days of seeded metrics per platform
  const today = new Date();
  for (let d = 0; d < 30; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    for (const platform of [Platform.META, Platform.GOOGLE, Platform.TIKTOK]) {
      const impressions = Math.round(8000 + Math.random() * 12000);
      const clicks = Math.round(impressions * (0.008 + Math.random() * 0.02));
      const conversions = Math.round(clicks * (0.02 + Math.random() * 0.04));
      const spend = Math.round(clicks * (80 + Math.random() * 120));
      const revenue = Math.round(conversions * (4000 + Math.random() * 6000));
      const existing = await db.metricDaily.findFirst({
        where: { date, platform, campaignId: campaign.id, adId: null },
      });
      if (existing) continue;
      await db.metricDaily.create({
        data: {
          date,
          platform,
          campaignId: campaign.id,
          impressions,
          clicks,
          conversions,
          spend,
          revenue,
          ctr: (clicks / impressions) * 100,
          cpc: spend / Math.max(clicks, 1) / 100,
          cpa: spend / Math.max(conversions, 1) / 100,
          roas: revenue / Math.max(spend, 1),
        },
      });
    }
  }

  await db.experiment.upsert({
    where: { id: "seed-exp-1" },
    update: {},
    create: {
      id: "seed-exp-1",
      orgId: org.id,
      campaignId: campaign.id,
      name: "Headline split: benefit vs. proof",
      kind: "headline",
      status: ExperimentStatus.RUNNING,
      trafficSplit: { A: 50, B: 50 },
      primaryMetric: "roas",
      variants: {
        create: [
          { key: "A", payload: { headline: "Clinical-grade results in 30 days." } },
          { key: "B", payload: { headline: "7,000 reviews. One honest formula." } },
        ],
      },
    },
  });

  // eslint-disable-next-line no-console
  console.log("Seeded org", org.slug, "brand", brand.name, "campaign", campaign.name);
}

main().finally(() => db.$disconnect());
