import { AgentKind, Platform } from "@prisma/client";
import { makePlatformAgent } from "./_platform-agent";

export const adsApple = makePlatformAgent(AgentKind.ADS_APPLE, Platform.APPLE, "Apple Ads");
