import { Platform } from "@prisma/client";
import { stubAdapter } from "./_stub";

// TODO(production): Apple Search Ads Campaign Management API.
//   - Auth: JWT-based, signed with ES256 using private key
//   - https://api.searchads.apple.com/api/v5
//   - Endpoints: /campaigns, /adgroups, /keywords, /reports
//   - Custom Product Pages (CPP) + MMP attribution (AppsFlyer, Adjust, Branch)
export const appleAdapter = stubAdapter(Platform.APPLE, "https://appleid.apple.com/auth/authorize");
