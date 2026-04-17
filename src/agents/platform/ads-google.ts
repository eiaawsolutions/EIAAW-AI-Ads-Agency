import { AgentKind, Platform } from "@prisma/client";
import { makePlatformAgent } from "./_platform-agent";

export const adsGoogle = makePlatformAgent(AgentKind.ADS_GOOGLE, Platform.GOOGLE, "Google Ads");
