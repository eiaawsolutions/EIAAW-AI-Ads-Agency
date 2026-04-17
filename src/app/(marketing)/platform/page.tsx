const MODULES = [
  { n: "01", t: "Agent runtime",        d: "Typed contracts, deterministic dispatch, persistent audit trail. Every run has tokens-in, tokens-out, cost, and output stored." },
  { n: "02", t: "Flow engine",          d: "Compose agents into pipelines. Autonomous / Assisted / Enterprise modes control human gates and escalation." },
  { n: "03", t: "Shared memory",        d: "Brand DNA, historical metrics, and experiment outcomes form a closed-loop memory each agent can query." },
  { n: "04", t: "Platform adapters",    d: "Unified interface over Meta, Google, TikTok, LinkedIn, Microsoft, YouTube, Apple. One launch call, seven surfaces." },
  { n: "05", t: "Real-time signals",    d: "Pixel + CAPI + server-side conversions dedupe at ingest. Anomalies page operators under 60s." },
  { n: "06", t: "Tenant isolation",     d: "Org-scoped rows + Postgres RLS. No cross-tenant reads. SOC 2 Type II readiness built in." },
];

const STACK = [
  ["Frontend",   "Next.js 15 · App Router · React 19 · Tailwind · shadcn/ui"],
  ["Backend",    "Next.js Route Handlers · Prisma 6 · Postgres 18"],
  ["AI",         "Anthropic Opus 4.7 + Haiku 4.5 · prompt caching · JSON-schema contracts"],
  ["Auth",       "NextAuth v5 · Google OIDC · JWT sessions · JITP for enterprise"],
  ["Billing",    "Stripe subscriptions · webhook-driven · usage-capped tiers"],
  ["Deploy",     "Railway · Postgres plugin · auto-deploy on push · healthcheck-gated"],
  ["Observability", "Structured logs · per-run AgentRun audit · Sentry-ready · OpenTelemetry hooks"],
  ["Security",   "OWASP Top 10 · CSP · HSTS · X-Frame-Options · rate-limited"],
];

export const metadata = { title: "Platform" };

export default function PlatformPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-16 md:pt-28">
          <span className="eyebrow">Platform</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            A runtime for an
            <br />
            <span className="text-muted-foreground">AI ad organization.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Six core systems, nineteen agents, seven platforms. Designed for pentest-readiness,
            deterministic audits, and closed-loop learning from day one.
          </p>
        </div>
      </section>

      {/* MODULES */}
      <section className="container">
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m, i) => {
              const isLastCol = (i + 1) % 3 === 0;
              const isLastRow = i >= 3;
              return (
                <div
                  key={m.n}
                  className={[
                    "p-8 transition-colors duration-150 hover:bg-surface-1/60",
                    !isLastCol ? "lg:hairline-r" : "",
                    !isLastRow ? "hairline-b lg:hairline-b" : "",
                  ].join(" ")}
                >
                  <span className="mono text-2xs text-muted-foreground tabular">{m.n}</span>
                  <h3 className="mt-4 text-sm font-medium">{m.t}</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{m.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* STACK TABLE */}
      <section className="container mt-24">
        <div className="max-w-2xl mb-10">
          <span className="eyebrow">Stack</span>
          <h2 className="mt-4 text-3xl display">
            Boring where it should be.
            <br />
            <span className="text-muted-foreground">Precise everywhere else.</span>
          </h2>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          {STACK.map(([k, v], i) => (
            <div key={k} className={`grid grid-cols-[180px_1fr] px-5 py-3.5 ${i > 0 ? "hairline-t" : ""}`}>
              <span className="eyebrow">{k}</span>
              <span className="mono text-sm text-foreground">{v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SECURITY CALLOUT */}
      <section className="container mt-24">
        <div className="rounded-lg border border-border p-12 bg-surface-1">
          <span className="eyebrow">Security posture</span>
          <h2 className="mt-4 text-2xl display max-w-2xl">
            Multi-tenant isolation at the database level.
            <br />
            <span className="text-muted-foreground">Not just at the app layer.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Every tenant-scoped row carries <span className="mono text-foreground">orgId</span>. Postgres RLS policies enforce isolation with
            <span className="mono text-foreground"> SET LOCAL app.current_org_id</span> set at the start of every request.
            Cross-tenant leakage tests run in CI. OAuth tokens are encrypted at rest with per-env keys.
          </p>
        </div>
      </section>
    </main>
  );
}
