import { Platform } from "@prisma/client";
import { stubAdapter } from "./_stub";

// TODO(production): TikTok Business API.
//   - Auth: https://business-api.tiktok.com/portal/auth
//   - Endpoints: /campaign/create/, /adgroup/create/, /ad/create/, /report/integrated/get/
//   - Events API for server-side conversions
//   - Spark Ads: authorization_code flow for organic post boosting
export const tiktokAdapter = stubAdapter(Platform.TIKTOK, "https://business-api.tiktok.com/portal/auth");
