import { AgentKind, Platform } from "@prisma/client";
import { makePlatformAgent } from "./_platform-agent";

export const adsMicrosoft = makePlatformAgent(AgentKind.ADS_MICROSOFT, Platform.MICROSOFT, "Microsoft Ads");
