import { AgentKind, Platform } from "@prisma/client";
import { makePlatformAgent } from "./_platform-agent";

export const adsTiktok = makePlatformAgent(AgentKind.ADS_TIKTOK, Platform.TIKTOK, "TikTok Ads");
