# Meta (Facebook) OAuth — Live Setup Runbook

Step-by-step to flip Meta from sandbox to a real OAuth connection
against your EIAAW Solutions ad account (or any client account you
manage). Estimated time: 30-45 minutes for the developer-console work,
then ~5 minutes to verify end-to-end.

---

## Prerequisites

- A **Meta Business Manager** account that owns the ad account you
  want to connect (https://business.facebook.com).
- Personal admin access to that Business Manager.
- Infisical project `eiaaw-ai-ads-agency-prod` already created (from
  Step 1 of the deploy plan).
- Production deploy at `https://ads.eiaawsolutions.com` is live.

---

## Step 1 — Create a Meta Developer App

1. Go to https://developers.facebook.com/apps and click **Create App**.
2. **Use case**: select **"Other"** → **Next**.
3. **App type**: **Business** → **Next**.
4. **App name**: `EIAAW AI Ads Agency` (or `EIAAW Ads — prod` if you
   plan to make a separate `staging` app later).
5. **Contact email**: `eiaawsolutions@gmail.com`.
6. **Business portfolio**: select the EIAAW Business Manager. (If you
   don't see one, create it at https://business.facebook.com first.)
7. Click **Create app**. You'll land on the app dashboard.

Copy the **App ID** at the top of the dashboard — you'll need it later.

---

## Step 2 — Add Facebook Login for Business

The app needs an OAuth product attached.

1. In the left rail under **Add products**, find **Facebook Login for
   Business** and click **Set up**.
2. Skip the "Quickstart" — you don't need it.
3. Go to **Facebook Login for Business → Settings**.
4. **Valid OAuth Redirect URIs** (the most important field): add
   exactly:
   ```
   https://ads.eiaawsolutions.com/api/integrations/meta/callback
   ```
   No trailing slash. Wildcards not allowed.
   For local dev, you can also add `http://localhost:3000/api/integrations/meta/callback`
   if you want to test the flow on your laptop.
5. **Login with the JavaScript SDK**: leave OFF.
6. **Enforce HTTPS**: ON.
7. **Use Strict Mode for redirect URIs**: ON.
8. Save changes.

---

## Step 3 — Add the Marketing API permission

1. In the left rail under **Add products**, find **Marketing API**
   and click **Set up**.
2. You'll be taken to a Marketing API page. No further config is
   required at this step — adding it just enables the scopes we need.

---

## Step 4 — Configure App Settings → Basic

1. Left rail → **App settings → Basic**.
2. **App Domains**: `eiaawsolutions.com`
3. **Privacy Policy URL**: any URL you have for a privacy policy
   (Meta requires this even in Dev mode). If you don't have one yet,
   `https://ads.eiaawsolutions.com/legal/privacy` is fine — your
   project already serves that page.
4. **Terms of Service URL**: `https://ads.eiaawsolutions.com/legal/terms`
5. **Category**: `Business and Pages`.
6. **Business Use**: `Support my own business`.
7. Save changes.

Now copy the **App Secret** (click "Show" — you'll be prompted for
your Facebook password). This is the value that goes into Infisical.

---

## Step 5 — Add yourself + the test ad account as developers

While the app is in **Development mode**, only people listed as
developers can OAuth into it. To connect your real EIAAW ad account
without going through App Review:

1. Left rail → **App roles → Roles**.
2. **Add People** → enter your Facebook user (the one that admins
   the Business Manager) → role: **Admin** or **Developer** → invite.
3. Accept the invite (you'll get a notification on Facebook).
4. Left rail → **Marketing API** (or App Settings → Advanced if
   prompted) → ensure your Business Manager and the ad account are
   listed as test assets.

---

## Step 6 — Put the credentials into Infisical

Per the EIAAW Deploy Contract, secrets go into Infisical, not raw
into Railway env.

1. Open https://app.infisical.com → project `eiaaw-ai-ads-agency-prod`
   → environment `prod`.
2. Navigate to the path `/integrations/meta` (create the folder if it
   doesn't exist — Infisical UI: "Add Folder").
3. Add two secrets:
   - **`META_APP_ID`** = the App ID from Step 1 (e.g. `1234567890123456`)
   - **`META_APP_SECRET`** = the App Secret from Step 4
4. Verify the handles in `.env.example` match these paths:
   ```
   META_APP_ID=secret://eiaaw-ai-ads-agency-prod/prod/integrations/meta/META_APP_ID
   META_APP_SECRET=secret://eiaaw-ai-ads-agency-prod/prod/integrations/meta/META_APP_SECRET
   ```
   They should be identical to what we already shipped in `.env.example`.
   If you used a different folder/name in Infisical, update
   `.env.example` to match.

---

## Step 7 — Make sure Railway has the bootstrap creds

The resolver only runs in production when these are set:

```
INFISICAL_RESOLVER_ENABLED=true
INFISICAL_PROJECT_ID=<from Infisical project settings>
INFISICAL_APP_CLIENT_ID=<machine identity client id>
INFISICAL_APP_CLIENT_SECRET=<machine identity client secret>
META_APP_ID=secret://eiaaw-ai-ads-agency-prod/prod/integrations/meta/META_APP_ID
META_APP_SECRET=secret://eiaaw-ai-ads-agency-prod/prod/integrations/meta/META_APP_SECRET
```

In Railway: **EIAAW-AI-Ads-Agency** service → **Variables**. Add all
six. The resolver will fetch the META_* values from Infisical at the
next deploy boot.

---

## Step 8 — Trigger a redeploy and verify

Push any small change (or click "Redeploy" in Railway) so
`instrumentation.ts` fires with the new env. In the deploy logs you
should see:

```
[infisical] resolved 2 secret(s) at boot: META_APP_ID, META_APP_SECRET
```

(plus the others as you migrate them — for now Meta is enough.)

Then go to `https://ads.eiaawsolutions.com/dashboard/integrations`,
click **Connect** next to Meta. You should be redirected to the real
Facebook OAuth dialog (not our internal sandbox callback). Authorize.
You'll land back on the integrations page with a "META is now linked"
banner and the Meta row showing **Connected · live** (instead of
**sandbox**).

---

## What Claude verifies after you say "done"

Once you confirm the redirect URI is registered and the Infisical
secrets are set, I'll:

1. Confirm the redeployed instance resolved both META_* handles
   (via Railway logs).
2. Test the OAuth dance end-to-end against `ads.eiaawsolutions.com`
   from a fresh browser.
3. Verify the resulting `Integration` row has the right scopes and
   a real long-lived access token (not the `stub_meta_*` literal).
4. Confirm the connect-trigger fired an audit job and the audit
   used real Meta Insights data instead of the platform-stub
   metrics.
5. Add a small "live · last sync" indicator to the integrations
   page for the row's `expiresAt` and last metric ingest time.

Tell me when Steps 1-7 are done and we'll do the verification pass.

---

## Common gotchas

- **"URL Blocked: This redirect failed because the redirect URI is
  not whitelisted"** → the URL in **Facebook Login for Business →
  Settings → Valid OAuth Redirect URIs** doesn't exactly match what
  the app sent. Common cause: trailing slash, http vs https, or
  `eiaaw.com` vs `eiaawsolutions.com`. Fix the entry to match exactly.

- **"The user is not allowed to do this action"** at OAuth time →
  you're in Dev mode and the Facebook account you're using isn't
  listed under **App roles**. Add yourself as Admin or Developer.

- **"Invalid App ID"** → the value resolved from Infisical is wrong
  or empty. Check Railway logs for the `[infisical] resolved ...`
  line — if META_APP_ID isn't listed, the handle didn't resolve.

- **403 from Insights API after a successful OAuth** → the
  `ads_management` and `ads_read` scopes are restricted in Dev mode
  to test users on test ad accounts. Make sure the account you're
  connecting is added as a test asset under the Business Manager.

- **Token expires after 60 minutes** → expected on first exchange.
  Our adapter calls `exchangeForLongLived` immediately, which gives
  back a ~60-day token. If you're seeing 1-hour expiry on the
  Integration row, the long-lived swap failed silently — Claude
  will dig into this in the verification pass.

---

## What "App Review" buys you (not needed today, useful to know)

In Dev mode the app works for whitelisted users on whitelisted
business assets. Once you want **clients of EIAAW** (other companies
that aren't on your developer list) to be able to connect their own
Meta accounts through this product, you submit the app for App Review.

Required scopes for review:
- `ads_management` — to launch/pause campaigns
- `ads_read` — to pull insights
- `business_management` — to read business assets
- (optional) `pages_show_list`, `pages_read_engagement` if you ever
  want to manage Page-level placements

App Review takes 1-2 weeks and requires:
- A screencast of the OAuth flow
- A clear data-use justification per scope
- A test login for the reviewer (add a test Facebook user under
  **App roles → Test Users**)

This is a future task — for the EIAAW Solutions account itself you
do not need App Review. Mention it again when you want to onboard
external clients.
