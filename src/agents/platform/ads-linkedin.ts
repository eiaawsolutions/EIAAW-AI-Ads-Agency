import { AgentKind, Platform } from "@prisma/client";
import { makePlatformAgent } from "./_platform-agent";

export const adsLinkedin = makePlatformAgent(AgentKind.ADS_LINKEDIN, Platform.LINKEDIN, "LinkedIn Ads");
