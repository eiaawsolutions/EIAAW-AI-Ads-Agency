import { Platform } from "@prisma/client";
import { stubAdapter } from "./_stub";

// TODO(production): Google Ads API client (google-ads-api npm).
//   - Auth: https://accounts.google.com/o/oauth2/v2/auth
//   - Developer token required (requires approval from Google)
//   - Scopes: https://www.googleapis.com/auth/adwords
//   - Services: CampaignService, AdGroupService, AdService, CustomerService
//   - Performance Max: AssetGroupService + CampaignBudgetService
export const googleAdapter = stubAdapter(Platform.GOOGLE, "https://accounts.google.com/o/oauth2/v2/auth");
