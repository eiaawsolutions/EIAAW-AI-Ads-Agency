# EIAAW — Autonomous AI Ads Agency

A multi-agent AI organization for performance advertising. Plans, launches, optimizes, and scales paid campaigns across Meta, Google, TikTok, LinkedIn, Microsoft, YouTube, and Apple Ads.

> **Status:** v0.1 — full architecture + stubs. Agent runtime, database schema, UI, and dashboards are real and runnable. Platform API integrations are stubbed behind a unified adapter interface (TODOs marked per file).

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill DATABASE_URL (Railway Postgres), AUTH_SECRET, ANTHROPIC_API_KEY (optional for dev)

# 3. Initialize database
npm run db:push
npm run db:seed

# 4. Start dev server
npm run dev
```

Open http://localhost:3000. The onboarding wizard works end-to-end against stubbed agents if `ANTHROPIC_API_KEY` is unset; set it to get real Claude-generated strategy and DNA.

## Project structure

```
src/
  agents/              # 19 AI agents (strategy / platform / cross / creative)
    _base.ts           # Claude wrapper with JSON-schema contracts + pricing
    dispatcher.ts      # runs agents, persists AgentRun audit rows
    registry.ts        # kind → agent module map
    types.ts           # Agent interface + AgentContext
    strategy/          # ads-dna, ads-plan, ads-create, ads-math, ads-budget
    platform/          # ads-meta, ads-google, ads-tiktok, ads-linkedin,
                       # ads-microsoft, ads-youtube, ads-apple
    cross/             # ads-audit, ads-creative, ads-competitor,
                       # ads-landing, ads-test
    creative/          # ads-generate, ads-photoshoot
  integrations/        # Platform adapters (unified interface, stubbed for now)
    types.ts           # PlatformAdapter interface
    registry.ts        # platform → adapter map
    _stub.ts           # simulator returning realistic-looking metrics
    meta.ts google.ts tiktok.ts linkedin.ts
    microsoft.ts youtube.ts apple.ts
  app/
    (marketing)/       # home, pricing, platform, agents
    onboarding/        # 6-step wizard (DNA → plan → competitor → forecast → launch)
    dashboard/         # home, performance, live, campaigns, experiments,
                       # budget, creatives, agents, reports, audit,
                       # integrations, settings, docs
    api/
      agents/{kind}/   # one route per agent → dispatcher
      integrations/{platform}/connect, /callback
      stripe/checkout, /webhook
      auth/[...nextauth]
      health
  components/
    ui/                # Button, Card, Input, Badge, Progress, ...
    brand/             # LogoMark, LogoWordmark
    marketing/         # Navbar, Footer
    dashboard/         # Sidebar, Topbar, StatCard, PerformanceChart
    wizard/            # Zustand store + 7 step components
  lib/                 # db, auth, anthropic, stripe, tenant, utils
prisma/
  schema.prisma        # multi-tenant schema (orgs, brands, campaigns, ad sets,
                       # ads, metrics, experiments, integrations, agent runs,
                       # reports, audit log)
  policies.sql         # Postgres RLS policies for tenant isolation
  seed.ts              # demo org, brand, DNA, campaign, 30 days of metrics
```

## Key scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Prisma generate + Next build |
| `npm run start` | Production server |
| `npm run db:push` | Sync schema (dev) |
| `npm run db:migrate` | Create migration |
| `npm run db:deploy` | Apply migrations (prod/CI) |
| `npm run db:seed` | Seed demo org + metrics |
| `npm run db:studio` | Prisma Studio |
| `npm run typecheck` | `tsc --noEmit` |

## Deployment (Railway)

1. Create a new Railway project + Postgres plugin. Copy `DATABASE_URL` (+ `DIRECT_URL`) into Variables.
2. Add `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, and optional `ANTHROPIC_API_KEY`, `STRIPE_*`, platform OAuth credentials.
3. Deploy from this repo — Railway detects `railway.json` / `nixpacks.toml`. The startup command runs `prisma migrate deploy` before booting.
4. (Optional) Apply `prisma/policies.sql` to enable Postgres RLS; set `ENABLE_RLS=true` in env.

## Extending

- **Add a new agent**: create `src/agents/{category}/ads-{name}.ts` implementing the `Agent` interface, register in `src/agents/registry.ts`, add a route at `src/app/api/agents/ads-{name}/route.ts`. Add the kind to `AgentKind` enum in `prisma/schema.prisma`.
- **Wire a real platform API**: replace the `stubAdapter(...)` call in `src/integrations/{platform}.ts` with a real client. The interface (`PlatformAdapter`) is the contract.
- **Add a dashboard page**: create `src/app/dashboard/{slug}/page.tsx`, add to `src/components/dashboard/sidebar.tsx` NAV.

## Security notes

- Multi-tenant isolation via `orgId` on every tenant-scoped row + Postgres RLS (policies in `prisma/policies.sql`).
- OAuth tokens stored with `@db.Text` placeholders — **add app-layer encryption before storing real tokens** (AES-GCM with a per-env key).
- CSRF: OAuth connect route returns a state token; real implementation should persist it in a signed cookie and verify on callback.
- Stripe webhook verifies signature; fails closed without `STRIPE_WEBHOOK_SECRET`.
- Security headers set in `next.config.ts`.

## License

Private — © EIAAW Solutions.
