import { AgentKind, Platform } from "@prisma/client";
import { makePlatformAgent } from "./_platform-agent";

export const adsMeta = makePlatformAgent(AgentKind.ADS_META, Platform.META, "Meta Ads");
