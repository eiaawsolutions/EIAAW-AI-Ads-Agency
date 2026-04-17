import { AgentKind, Platform } from "@prisma/client";
import { makePlatformAgent } from "./_platform-agent";

export const adsYoutube = makePlatformAgent(AgentKind.ADS_YOUTUBE, Platform.YOUTUBE, "YouTube Ads");
