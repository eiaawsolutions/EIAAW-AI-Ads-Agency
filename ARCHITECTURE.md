# EIAAW Architecture

## System shape

```
┌────────────────────────────────────────────────────────────────────┐
│                        EIAAW (Next.js 15 app)                      │
│                                                                    │
│  Marketing  ──────▶  Onboarding Wizard  ──────▶  Dashboard         │
│    (SSR)              (RSC + Zustand)             (RSC + client)   │
│                             │                                      │
│                             ▼                                      │
│                        ┌──────────┐                                │
│                        │ Agent    │  19 agents, typed contracts    │
│                        │ Dispatcher│  persists every run            │
│                        └────┬─────┘                                │
│                             │                                      │
│     ┌───────────────────────┼──────────────────────────┐           │
│     ▼                       ▼                          ▼           │
│ Claude API              Postgres (Prisma)       Platform Adapters  │
│ (Opus/Haiku)            (multi-tenant, RLS)     (7 stubbed)        │
│                                                        │           │
└────────────────────────────────────────────────────────┼───────────┘
                                                         │
                              ┌──────────────────────────┼──────────────────────────┐
                              ▼                          ▼                          ▼
                        Meta Graph API          Google Ads API            TikTok / LinkedIn /
                        (FB/IG)                 (Search/PMax/YT)           MS / Apple Ads
```

## Layers

### 1. Presentation
- **Marketing** (`src/app/(marketing)`): SSR pages with a Railway-style aesthetic (dark base, teal gradients, grid lines, glass cards).
- **Onboarding wizard** (`src/app/onboarding`): 6 steps persisted in `localStorage` via Zustand, each step calls an agent API and renders the result. Resumable.
- **Dashboard** (`src/app/dashboard`): sidebar + topbar shell with 13 pages. Server components where possible; `use client` only for interactivity (live monitor stream, forms, charts).

### 2. Agent runtime (`src/agents`)
Every agent implements:

```ts
interface Agent<Input, Output> {
  kind: AgentKind;
  name: string;
  description: string;
  validate?(input): void;
  run(ctx: AgentContext, input): Promise<AgentResult<Output>>;
}
```

- `jsonComplete` (in `_base.ts`) wraps Claude calls with JSON-schema contracts and prompt caching on the system message.
- Without `ANTHROPIC_API_KEY`, agents return deterministic stub outputs so the UI is fully usable in dev.
- **Dispatcher** persists every run as an `AgentRun` row with tokens-in, tokens-out, cost, and output — the dashboard reads from this table.
- **Categories**: `strategy` (5), `platform` (7), `cross` (5), `creative` (2) = **19 agents**.

### 3. Platform integrations (`src/integrations`)
Unified `PlatformAdapter` interface with three methods:

- `authUrl(redirectUri, state)` — OAuth authorization URL
- `exchangeCode(code, redirectUri)` — token exchange
- `execute(ctx, { action, campaignId, payload })` — launch / pause / optimize / sync_metrics

Every platform ships with a `stubAdapter` that simulates success. Real clients replace the stub per file; each file carries a detailed TODO block with endpoint, scopes, and auth URL.

### 4. Data layer (`prisma/schema.prisma`)
**Tenant model:**
- `Organization` → `Membership[]` (users) → role-based access
- Every tenant-scoped row carries `orgId` + index
- `policies.sql` enables Postgres RLS with `app.current_org_id` GUC

**Entities:**
- Identity: `User`, `Account`, `Session`, `Organization`, `Membership`
- Brand: `Brand`, `BrandDna` (JSON-rich)
- Campaigns: `Campaign`, `AdSet`, `Ad` (platform-agnostic)
- Metrics: `MetricDaily` (unique by date+platform+campaign+ad)
- Experiments: `Experiment`, `ExperimentVariant`
- Ops: `AgentRun`, `Integration`, `Subscription`, `Report`, `AuditLog`

**Enums:** 8 (Role, Plan, Platform, CampaignObjective, CampaignStatus, AgentKind, AgentRunStatus, ExperimentStatus, ExecutionMode)

### 5. Security
- **Tenant isolation**: middleware + app-layer `orgId` filter + optional Postgres RLS.
- **Auth**: NextAuth v5 with Prisma adapter, JWT sessions, Google + Credentials providers.
- **Token storage**: integration access/refresh tokens stored as `@db.Text`; production must layer AES-GCM encryption with a per-env key.
- **CSRF on OAuth**: callback expects a state token; signed-cookie verification is a TODO.
- **Webhooks**: Stripe webhook verifies signature; fails closed without secret.
- **Headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` in `next.config.ts`.
- **Pentest-ready posture**: no user enumeration on signin, no stack traces leaked, deterministic error messages on agent failures.

## Execution modes

Each org has an `executionMode`:
- **AUTONOMOUS** — agents run without human gates; best for scaled accounts with proven guardrails.
- **ASSISTED** (default) — human approves launch and major budget shifts.
- **ENTERPRISE** — custom rules, SAML/SCIM, sign-off workflow.

The dispatcher consults `ctx.executionMode` when deciding whether to halt on non-critical failures.

## Closed-loop learning

```
ads-dna ─┐
          ├─▶ ads-plan ─▶ ads-competitor ─▶ ads-create ─▶ ads-generate ─▶ launch
ads-math ─┘                                                                │
                                                                           ▼
                                                                       ads-audit
                                                                           │
                                                                           ▼
                                                                       ads-test
                                                                           │
                                                                           ▼
                                     ads-budget ◀─── ads-creative ◀─── metrics
                                         │
                                         └─▶ scale / kill decisions ──▶ back to top
```

Outputs feed a shared memory layer (the Postgres database). Each weekly cycle, `ads-dna` is re-run with the prior week's winners; `ads-create` uses experiment results to bias concept generation toward proven angles.

## Cost & observability

- Every agent run records `tokensIn`, `tokensOut`, `costUsd`, and `model`.
- `PRICING` table in `_base.ts` is the single source of truth for model pricing.
- Anthropic system prompts are cached (`cache_control: ephemeral`) to reduce cost across repeated agent invocations.
- Health endpoint at `/api/health` checks DB connectivity — Railway healthchecks rely on it.

## What's NOT built (intentionally)

- Real platform API calls — adapters are stubbed. Each file has a TODO with the exact endpoints and scopes.
- PDF report generation — `Report` table exists; rendering is a follow-up.
- Image generation — `ads-generate` and `ads-photoshoot` return placeholder URLs; plug in FAL.AI, banana-claude, or self-hosted SDXL via env.
- SOC 2 evidence collection (log retention policies, backup strategy, DR drill runbook) — add when pursuing certification.
- Background workers — long-running agent flows run inline. Production should move to Temporal or Inngest for durability and retries (see Phase 2G content-pipeline-runtime reference).

## Roadmap to production

1. Encrypt integration tokens (AES-GCM, KMS-sourced key).
2. Wire one real platform — Meta recommended (richest docs, immediate CAPI value).
3. Move agent flows to a durable executor (Inngest or Temporal).
4. Implement Stripe webhook → Subscription row sync.
5. Add FAL.AI / banana-claude for `ads-generate`.
6. Apply `policies.sql` + set `ENABLE_RLS=true` in production.
7. Add Sentry + OpenTelemetry.
