# Deploy to Railway

## Current state (verified locally)

- ✅ npm install: 574 packages, exit 0
- ✅ `npx tsc --noEmit`: zero errors
- ✅ `next build`: 44 routes compiled
- ✅ `prisma db push`: Railway Postgres synced (17 tables)
- ✅ `prisma db seed`: demo org + 90 metric rows + experiment
- ✅ `GET /api/health`: `{ok:true, db:"up"}`
- ✅ `POST /api/agents/ads-math`: returns 3 forecast scenarios
- ✅ git commit `77be130` — ready to push

## Option A — CLI-driven (recommended, ~5 min)

### 1. Authenticate (one-time)

```bash
gh auth login        # GitHub: follow browser prompts
railway login        # Railway: follow browser prompts
```

### 2. Create GitHub repo and push

```bash
cd "c:/laragon/www/EIAAW Ai ADS AGENCY"
gh repo create eiaaw-ads-agency --private --source=. --remote=origin --push
```

### 3. Link Railway project (the Postgres DB you already provisioned)

```bash
railway link         # pick your existing project
```

### 4. Deploy the web service

The Postgres plugin is already there. Now add a web service linked to the GitHub repo:

- Open `railway open` → **+ New** → **GitHub Repo** → pick `eiaaw-ads-agency`
- Railway detects `railway.json` / `nixpacks.toml` and starts building

### 5. Wire environment variables

In the Railway dashboard, on the new web service:

- **Variables** tab → **+ Variable Reference** → pick Postgres → **`DATABASE_URL`**
- Add another reference for **`DIRECT_URL`** → same Postgres → `DATABASE_URL`
- Add raw variables:

```
AUTH_SECRET=XBAtMY6L+AEE8hcioYJ4ml7pWsJEj/ax74RjzHw0agE=
NEXT_PUBLIC_APP_URL=https://<your-railway-domain>
NODE_ENV=production
```

- Redeploy (Railway auto-triggers on variable change).

### 6. Generate a public domain

- On the web service → **Settings** → **Networking** → **Generate Domain**
- Copy the URL, update `NEXT_PUBLIC_APP_URL` in Variables, redeploy.

### 7. Verify

```bash
curl https://<your-domain>/api/health
# → {"ok":true,"db":"up","time":"..."}
```

Open the domain in a browser: marketing site renders, onboarding wizard works, dashboard loads seeded metrics.

---

## Option B — Manual (no CLI auth needed)

### 1. Create GitHub repo

- https://github.com/new → name `eiaaw-ads-agency` → Private → Create
- Back in terminal:

```bash
cd "c:/laragon/www/EIAAW Ai ADS AGENCY"
git remote add origin https://github.com/<your-username>/eiaaw-ads-agency.git
git push -u origin main
```

### 2. Connect Railway

- https://railway.app → your project (the one with Postgres)
- **+ New** → **Deploy from GitHub repo** → pick `eiaaw-ads-agency`
- Railway detects `railway.json`, starts building

### 3-7. Same as Option A, steps 5-7 above.

---

## What could go wrong

| Symptom | Cause | Fix |
|---|---|---|
| Build fails: `DATABASE_URL must be non-empty` | Variable not set on web service | Add a reference to the Postgres plugin |
| Healthcheck 503 after deploy | Migration ran but service can't reach DB | Check Postgres plugin is running; ensure `DATABASE_URL` uses internal host (`postgres.railway.internal`) not proxy |
| Build fails at `prisma generate` | `postinstall` couldn't find schema | Ensure `prisma/schema.prisma` is committed (it is) |
| 500 on `/api/agents/*` | `DATABASE_URL` set but no tables | Run `railway run npm run db:seed` once — or `railway run npx prisma db push` if schema never pushed |
| `themeColor` warnings at build | Next 15 deprecation | Already fixed — in `viewport` export |

## Cron wiring — durable job runtime

The job runtime ships with a self-draining tick route: every invocation
runs up to 4 ticks with 15s spacing, so a 1-minute cron gives us an
effective 15s cadence on queue advancement. Interactive flows (wizard)
fire an inline background tick on enqueue so they don't wait for cron.

### Set up Railway Cron (5-minute cadence — Railway's hard minimum)

Already provisioned on production as service `eiaaw-worker-cron`. To recreate
from scratch:

1. Open the [Railway project dashboard](https://railway.app/project/519793db-d980-4032-bf2f-1b598e73b1a5)
2. **+ New** → **Empty Service**; set **Source** to Docker image `alpine/curl:latest`
3. **Settings → Deploy**:
   - **Cron Schedule**: `*/5 * * * *` (attempting less returns
     "Minimum interval between cron executions is 5 minutes")
   - **Custom Start Command** (must wrap in `sh -c` — the cron executor
     runs the string directly without invoking a shell, so `$BASE_URL`
     won't expand on its own; also `|| echo` so a curl failure shows
     the exit code in logs instead of being swallowed):

     ```bash
     sh -c "curl -fsS -X POST \"$BASE_URL/api/worker/tick\" -H \"x-eiaaw-worker-secret: $EIAAW_WORKER_SECRET\" || echo \"curl exit=$?\""
     ```

4. **Variables** on the cron service:
   - `BASE_URL=https://eiaaw-ai-ads-agency-production-6529.up.railway.app`
   - `EIAAW_WORKER_SECRET` = same value as on the web service

With enqueue's `fireImmediate` hook, interactive wizard flows run their
first step without waiting for the 5-minute cron. The cron exists to
advance retried steps and background jobs that weren't enqueued through
the HTTP path.

### Verification

After cron runs for ~1 minute:

```bash
# Response should show a non-empty ticks[] array.
curl -s -X POST \
  "https://eiaaw-ai-ads-agency-production-6529.up.railway.app/api/worker/tick" \
  -H "x-eiaaw-worker-secret: $EIAAW_WORKER_SECRET"
# {"ok":true,"mode":"drain","ticks":[{...,"status":"idle"}],"durationMs":...}
```

### Debug modes

- **`?mode=single`** — runs one tick only, returns in under a second.
  Useful for smoke tests and dev.
- **Default** — drains up to 4 × 15s = 60s. Used by cron.

## First production tweaks

Once the deploy is green, these are the highest-leverage follow-ups:

1. **Add `ANTHROPIC_API_KEY`** → agents switch from stub output to real Claude
2. **Stripe** → set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` for real subscriptions
3. **Apply RLS** → `railway run psql $DATABASE_URL -f prisma/policies.sql`, then set `ENABLE_RLS=true`
4. **Wire one real platform** → Meta first; replace stub in `src/integrations/meta.ts`
