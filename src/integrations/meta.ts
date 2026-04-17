import { Platform } from "@prisma/client";
import { stubAdapter } from "./_stub";

// TODO(production): replace stub with the Meta Marketing API client.
//   - Auth: https://www.facebook.com/v21.0/dialog/oauth
//   - Scopes: ads_management, ads_read, business_management
//   - Endpoints: /act_{ad_account_id}/campaigns, /adsets, /ads, /insights
//   - Webhook: Ads Insights changes via Graph API subscriptions
//   - CAPI: server-side conversions via /events endpoint (dedupe with pixel event_id)
export const metaAdapter = stubAdapter(Platform.META, "https://www.facebook.com/v21.0/dialog/oauth");
