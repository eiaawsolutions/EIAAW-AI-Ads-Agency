import { Platform } from "@prisma/client";
import { stubAdapter } from "./_stub";

// TODO(production): Microsoft Advertising (Bing Ads) API.
//   - Auth: https://login.microsoftonline.com/common/oauth2/v2.0/authorize
//   - Developer token required
//   - Services: CampaignManagement, CustomerBilling, Reporting (SOAP + REST)
//   - Import from Google Ads API available via Customer Import service
export const microsoftAdapter = stubAdapter(Platform.MICROSOFT, "https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
