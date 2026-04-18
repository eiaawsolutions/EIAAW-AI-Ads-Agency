import Link from "next/link";
import { Book, Code2, Cpu, Lock, Wrench } from "lucide-react";

const SECTIONS = [
  {
    icon: Book,
    eyebrow: "01",
    title: "Quickstart",
    body: "From signup to a launched campaign in 15 minutes. Connects an ad account, runs ads-dna, fires a forecast.",
    items: [
      ["Create your workspace",       "/onboarding"],
      ["Connect Meta / Google",       "/dashboard/integrations"],
      ["Run your first agent",        "/dashboard/agents"],
      ["Read the AgentRun audit log", "/dashboard/agents"],
    ],
  },
  {
    icon: Cpu,
    eyebrow: "02",
    title: "Agents reference",
    body: "Every agent's input schema, output contract, cost envelope, and failure modes.",
    items: [
      ["The full 19-agent roster",        "/agents"],
      ["Strategy agents (dna, plan, …)",  "/agents#strategy"],
      ["Platform agents (meta, google …)", "/agents#platform"],
      ["Cross-functional (audit, test …)", "/agents#cross"],
      ["Creative (generate, photoshoot)",  "/agents#creative"],
    ],
  },
  {
    icon: Code2,
    eyebrow: "03",
    title: "API reference",
    body: "REST endpoints under /api/agents/* — POST JSON, get JSON back. OpenAPI spec ships with v1.0 launch.",
    items: [
      ["Authentication",               "/docs#auth"],
      ["Common request shape",          "/docs#shape"],
      ["Rate limits",                   "/docs#rate-limits"],
      ["Cost caps & 402 semantics",     "/docs#cost-caps"],
      ["Error codes",                   "/docs#errors"],
    ],
  },
  {
    icon: Wrench,
    eyebrow: "04",
    title: "Platform integrations",
    body: "OAuth scopes, ad-account binding, token refresh, and what each connector ships today.",
    items: [
      ["Connector status matrix",       "/integrations"],
      ["Meta — GA",                     "/integrations#meta"],
      ["Google + LinkedIn — preview",   "/integrations#google"],
      ["Roadmap — TikTok, MS, YT, Apple", "/integrations#roadmap"],
    ],
  },
  {
    icon: Lock,
    eyebrow: "05",
    title: "Security & compliance",
    body: "Posture, sub-processors, encryption, incident response, DPA, and the procurement-ready evidence pack.",
    items: [
      ["Trust center",                 "/trust"],
      ["Sub-processors",                "/trust#sub-processors"],
      ["Encryption details",            "/trust#encryption"],
      ["Incident response SLA",         "/trust#incident-response"],
      ["Data Processing Addendum",      "/trust#dpa"],
    ],
  },
];

export const metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-16 md:pt-28">
          <span className="eyebrow">Docs</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            How to drive nineteen agents
            <br />
            <span className="text-muted-foreground">from one API.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Documentation is shipping alongside features. Sections below are live; deeper API reference and
            SDK packages land with the v1.0 GA milestone.
          </p>
        </div>
      </section>

      <section className="container py-20">
        <div className="grid md:grid-cols-2 gap-6">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="rounded-lg border border-border p-6 lg:p-8 bg-card">
                <div className="flex items-start gap-3">
                  <span className="rounded-md bg-surface-1 border border-border p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <span className="eyebrow">{s.eyebrow}</span>
                    <h2 className="mt-1 text-lg font-medium text-foreground">{s.title}</h2>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                <ul className="mt-5 space-y-1.5">
                  {s.items.map(([label, href]) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="flex items-center justify-between text-sm text-foreground/85 hover:text-foreground transition-colors py-1.5 px-2 -mx-2 rounded hover:bg-surface-1/60"
                      >
                        <span>{label}</span>
                        <span className="text-muted-foreground" aria-hidden>→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* MINI API REFERENCE */}
      <section className="container py-20 hairline-t">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-12">
          <div>
            <span className="eyebrow">API surface</span>
            <h2 className="mt-3 text-2xl md:text-3xl display max-w-md">
              Every agent is a POST.
              <br />
              <span className="text-muted-foreground">JSON in, JSON out.</span>
            </h2>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[80px_1fr_140px] items-center px-5 py-2.5 hairline-b bg-surface-1">
              <span className="eyebrow">Method</span>
              <span className="eyebrow">Endpoint</span>
              <span className="eyebrow">Auth</span>
            </div>
            {[
              ["POST", "/api/agents/ads-dna",         "session"],
              ["POST", "/api/agents/ads-plan",        "session"],
              ["POST", "/api/agents/ads-budget",      "session"],
              ["POST", "/api/agents/ads-meta",        "session + integration"],
              ["POST", "/api/agents/ads-google",      "session + integration"],
              ["POST", "/api/demo/dna",               "public · email-gated"],
              ["POST", "/api/enterprise/intake",      "public · rate-limited"],
              ["GET",  "/api/health",                 "none"],
            ].map(([m, p, a], i) => (
              <div key={p} className={`grid grid-cols-[80px_1fr_140px] items-center px-5 py-2.5 ${i > 0 ? "hairline-t" : ""}`}>
                <span className="mono text-2xs text-primary">{m}</span>
                <span className="mono text-xs text-foreground">{p}</span>
                <span className="mono text-2xs text-muted-foreground">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mt-16">
        <div id="auth" className="rounded-lg border border-border p-8 bg-surface-1 scroll-mt-20">
          <span className="eyebrow">Authentication</span>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Authenticated routes accept the session cookie set by NextAuth on signin. Programmatic API tokens
            ship with the v1.0 milestone — until then, run agents from a signed-in session or use the public
            demo endpoint.
          </p>
        </div>

        <div id="rate-limits" className="mt-6 rounded-lg border border-border p-8 bg-surface-1 scroll-mt-20">
          <span className="eyebrow">Rate limits</span>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            <li>· Agent endpoints — 30 requests / minute / (org × agent)</li>
            <li>· Live demo (/api/demo/dna) — 1 / hour / email · 3 / hour / IP</li>
            <li>· Enterprise intake — 5 / 10 minutes / IP</li>
            <li>· Auth endpoints — 10 / minute / IP</li>
          </ul>
          <p className="mt-3 text-2xs text-muted-foreground">
            Exceeding a limit returns <code className="mono text-foreground">429</code> with a
            <code className="mono text-foreground"> Retry-After</code> header.
          </p>
        </div>

        <div id="cost-caps" className="mt-6 rounded-lg border border-border p-8 bg-surface-1 scroll-mt-20">
          <span className="eyebrow">Cost caps</span>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Each workspace has a daily AI-cost cap by tier (Starter $5, Growth $25, Enterprise $250).
            Exceeding the cap returns <code className="mono text-foreground">402</code> with the
            <code className="mono text-foreground"> X-EIAAW-Cap-Reason</code> header. Caps reset at UTC midnight.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="hairline-t mt-24">
        <div className="container py-24 text-center">
          <h2 className="display text-2xl md:text-3xl text-balance max-w-2xl mx-auto">
            Need something deeper?
            <br />
            <span className="text-muted-foreground">We answer in one business day.</span>
          </h2>
          <div className="mt-8 flex items-center justify-center gap-2">
            <Link href="/enterprise" className="inline-flex items-center gap-2 rounded-md bg-primary/15 border border-primary/30 px-4 py-2 text-sm text-primary hover:bg-primary/20 transition-colors mono uppercase tracking-wider">
              Open intake form
            </Link>
            <a href="mailto:devrel@eiaawsolutions.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              devrel@eiaawsolutions.com
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
