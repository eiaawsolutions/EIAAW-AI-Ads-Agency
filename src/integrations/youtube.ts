import { Platform } from "@prisma/client";
import { stubAdapter } from "./_stub";

// TODO(production): YouTube Ads routed through Google Ads API (campaign type VIDEO).
//   - Reuses Google Ads OAuth token + developer token
//   - CampaignService with AdvertisingChannelType.VIDEO
//   - Demand Gen replaces Video Action Campaigns (migrate by Q2 2026)
export const youtubeAdapter = stubAdapter(Platform.YOUTUBE, "https://accounts.google.com/o/oauth2/v2/auth");
