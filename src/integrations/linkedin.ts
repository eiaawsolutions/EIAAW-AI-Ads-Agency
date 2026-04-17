import { Platform } from "@prisma/client";
import { stubAdapter } from "./_stub";

// TODO(production): LinkedIn Marketing API (REST).
//   - Auth: https://www.linkedin.com/oauth/v2/authorization
//   - Scopes: r_ads, rw_ads, r_ads_reporting, rw_organization_admin
//   - Endpoints: /adAccounts, /adCampaigns, /adCreatives, /adAnalytics
//   - Conversions API for offline conversions
export const linkedinAdapter = stubAdapter(Platform.LINKEDIN, "https://www.linkedin.com/oauth/v2/authorization");
