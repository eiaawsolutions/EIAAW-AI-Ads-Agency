import type { AgentKind } from "@prisma/client";
import type { Agent } from "./types";

import { adsDna } from "./strategy/ads-dna";
import { adsPlan } from "./strategy/ads-plan";
import { adsCreate } from "./strategy/ads-create";
import { adsMath } from "./strategy/ads-math";
import { adsBudget } from "./strategy/ads-budget";

import { adsGoogle } from "./platform/ads-google";
import { adsMeta } from "./platform/ads-meta";
import { adsTiktok } from "./platform/ads-tiktok";
import { adsLinkedin } from "./platform/ads-linkedin";
import { adsMicrosoft } from "./platform/ads-microsoft";
import { adsYoutube } from "./platform/ads-youtube";
import { adsApple } from "./platform/ads-apple";

import { adsAudit } from "./cross/ads-audit";
import { adsCreative } from "./cross/ads-creative";
import { adsCompetitor } from "./cross/ads-competitor";
import { adsLanding } from "./cross/ads-landing";
import { adsTest } from "./cross/ads-test";

import { adsGenerate } from "./creative/ads-generate";
import { adsPhotoshoot } from "./creative/ads-photoshoot";

export const registry: Record<AgentKind, Agent> = {
  ADS_DNA: adsDna,
  ADS_PLAN: adsPlan,
  ADS_CREATE: adsCreate,
  ADS_MATH: adsMath,
  ADS_BUDGET: adsBudget,

  ADS_GOOGLE: adsGoogle,
  ADS_META: adsMeta,
  ADS_TIKTOK: adsTiktok,
  ADS_LINKEDIN: adsLinkedin,
  ADS_MICROSOFT: adsMicrosoft,
  ADS_YOUTUBE: adsYoutube,
  ADS_APPLE: adsApple,

  ADS_AUDIT: adsAudit,
  ADS_CREATIVE: adsCreative,
  ADS_COMPETITOR: adsCompetitor,
  ADS_LANDING: adsLanding,
  ADS_TEST: adsTest,

  ADS_GENERATE: adsGenerate,
  ADS_PHOTOSHOOT: adsPhotoshoot,
};

export function getAgent(kind: AgentKind): Agent {
  const agent = registry[kind];
  if (!agent) throw new Error(`Unknown agent: ${kind}`);
  return agent;
}
