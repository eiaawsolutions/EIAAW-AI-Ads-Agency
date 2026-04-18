import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type Tag = "feat" | "design" | "fix" | "sec" | "docs";

type Entry = {
  date: string;       // YYYY-MM-DD
  tag: Tag;
  title: string;
  body: string;
};

const ENTRIES: Entry[] = [
  {
    date: "2026-04-18",
    tag: "feat",
    title: "Procurement-ready marketing surface",
    body: "Shipped /trust (sub-processors, encryption, incident response, DPA, compliance roadmap), /enterprise (intake form + Cal.com hook + lead capture), /customers (2 anonymized pilot case studies with verified metrics), /legal/privacy + /legal/terms (PDPA + GDPR + Malaysia governing law), /docs and /integrations. Scarcity badge replaces v0.1, FAQ now caveats platform GA status precisely.",
  },
  {
    date: "2026-04-18",
    tag: "feat",
    title: "Live ads-dna demo on the hero",
    body: "Replaced the scripted AgentTerminal with a real Claude run. Visitors enter their site + work email and watch the actual brand-DNA agent extract positioning, audience, palette, and tone in ~10 seconds. Defense-in-depth: per-email + per-IP rate limits, free-mail blocklist, hard daily cap of 50 demo runs to protect the AI budget. Every run captures an EnterpriseLead row tagged utmSource=live-demo.",
  },
  {
    date: "2026-04-18",
    tag: "feat",
    title: "Real Claude activation + observability hardening (C3)",
    body: "Defaulted to Haiku 4.5 as primary (20× cheaper than Opus, sufficient for current agent roster). Prompt caching enabled on system prompts — cache hits within 5 min pay 10% of input cost. New /api/admin/usage returns today's spent/cap/remaining, per-agent cost breakdown, and last 10 runs with model + tokens. PROMPT_VERSION baked into every AgentRun output as _meta for reproducibility.",
  },
  {
    date: "2026-04-18",
    tag: "feat",
    title: "Job runtime + RLS scaffolding",
    body: "JobRun + JobStep models added — durable execution with idempotent steps, backoff scheduling, correlationId for UI polling. Postgres RLS policies + withRls() transaction wrapper landed; ENABLE_RLS still false in prod pending an audit-and-wrap of every raw db.* callsite.",
  },
  {
    date: "2026-04-17",
    tag: "feat",
    title: "Production-grade Meta Marketing API adapter (B2)",
    body: "Real Meta connector with OAuth login, ad-account picker, encrypted token vault, error normalization, rate-limit aware client. First platform in GA — Google + LinkedIn following the same playbook in private preview this quarter.",
  },
  {
    date: "2026-04-17",
    tag: "sec",
    title: "Package A — cost caps, rate limiting, token encryption, test suite",
    body: "Daily AI-cost cap per organization with 402 enforcement (Starter $5, Growth $25, Enterprise $250). Sliding-window rate limiter (Upstash Redis in prod, in-memory dev fallback) on agents, auth, OAuth callbacks. AES-256-GCM envelope encryption for OAuth tokens with v1: version prefix for rotation. Vitest suite ships with 64 tests across crypto, rate-limit, agents, and platforms.",
  },
  {
    date: "2026-04-17",
    tag: "design",
    title: "Dawn palette + per-platform brand colors",
    body: "Switched from generic dark theme to a warm Dawn palette with a teal primary. Each platform (Meta, Google, TikTok, LinkedIn, Microsoft, YouTube, Apple) gets its native brand color on chips and data surfaces — visual fidelity at a glance for multi-platform reporting.",
  },
  {
    date: "2026-04-17",
    tag: "design",
    title: "Linear-tier redesign across all surfaces",
    body: "Hairline borders instead of cards. Asymmetric grids. Mono numerals on data. Display type for headings, body for everything else. Lifted the visual quality bar from \"AI dashboard\" to \"product an enterprise CISO would assume came from a 50-person design team.\"",
  },
];

export const metadata = { title: "Changelog" };

const TAG_STYLES: Record<Tag, string> = {
  feat:   "border-primary/30 text-primary bg-primary/10",
  design: "border-pink-400/30 text-pink-400 bg-pink-400/10",
  fix:    "border-amber-400/30 text-amber-400 bg-amber-400/10",
  sec:    "border-red-400/30 text-red-400 bg-red-400/10",
  docs:   "border-border-strong text-muted-foreground bg-surface-1",
};

export default function ChangelogPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-16 md:pt-28">
          <span className="eyebrow">Changelog</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            Shipping cadence,
            <br />
            <span className="text-muted-foreground">in plain language.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            We ship every weekday and write what changed in language you&apos;d use to explain it to a customer.
            Subscribe by adding the RSS feed (coming soon) or watching the GitHub release tags.
          </p>
        </div>
      </section>

      <section className="container py-16">
        <div className="space-y-1">
          {ENTRIES.map((e, i) => {
            const showDate = i === 0 || ENTRIES[i - 1].date !== e.date;
            return (
              <div key={`${e.date}-${i}`}>
                {showDate && (
                  <div className="mt-12 first:mt-0 mb-4 flex items-center gap-3">
                    <span className="eyebrow">{e.date}</span>
                    <span className="flex-1 hairline-b" />
                  </div>
                )}
                <article className="rounded-lg border border-border p-6 lg:p-8 mb-3 bg-card">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-2xs uppercase ${TAG_STYLES[e.tag]}`}>
                      {e.tag}
                    </Badge>
                    <h2 className="text-base font-medium text-foreground">{e.title}</h2>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{e.body}</p>
                </article>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="hairline-t mt-12">
        <div className="container py-20 text-center">
          <h2 className="display text-2xl md:text-3xl text-balance max-w-2xl mx-auto">
            Want what we ship next?
            <br />
            <span className="text-muted-foreground">Talk to us — design partners ship first.</span>
          </h2>
          <div className="mt-8 flex items-center justify-center gap-2">
            <Link href="/enterprise" className="inline-flex items-center gap-2 rounded-md bg-primary/15 border border-primary/30 px-4 py-2 text-sm text-primary hover:bg-primary/20 transition-colors mono uppercase tracking-wider">
              Become a design partner
            </Link>
            <Link href="/customers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              See pilot outcomes
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
