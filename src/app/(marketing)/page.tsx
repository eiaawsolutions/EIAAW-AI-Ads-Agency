import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LiveDemoTerminal } from "@/components/marketing/live-demo-terminal";
import { PlatformChip } from "@/components/platform/chip";

const PLATFORMS = ["meta", "google", "tiktok", "linkedin", "microsoft", "youtube", "apple"];

const AGENTS_BY_CATEGORY = [
  { label: "Strategy", items: ["ads-dna", "ads-plan", "ads-create", "ads-math", "ads-budget"] },
  { label: "Platform", items: ["ads-meta", "ads-google", "ads-tiktok", "ads-linkedin", "ads-microsoft", "ads-youtube", "ads-apple"] },
  { label: "Cross-functional", items: ["ads-audit", "ads-creative", "ads-competitor", "ads-landing", "ads-test"] },
  { label: "Creative", items: ["ads-generate", "ads-photoshoot"] },
];

const FEATURES = [
  { title: "Multi-agent orchestration", body: "Nineteen agents with one responsibility each. A central dispatcher coordinates, a shared memory layer closes the loop." },
  { title: "Experiment-native runtime",  body: "Every creative ships inside a designed A/B. Sample size, significance, and traffic splits are computed — not guessed." },
  { title: "Predictive budgeting",       body: "Three scenarios before you spend a dollar: conservative, moderate, aggressive. Grounded in category benchmarks." },
  { title: "Unified platform surface",   body: "One launch call, seven execution platforms. Meta, Google, TikTok, LinkedIn, Microsoft, YouTube, Apple — under one API." },
  { title: "Closed-loop learning",       body: "Experiment results feed back into concept generation and brand DNA. Each week the system gets smarter about your brand." },
  { title: "Full telemetry",             body: "Every agent run is persisted with tokens in, tokens out, cost, and output. No black boxes. Full audit trail per tenant." },
];

const WORKFLOW: [string, string, string][] = [
  ["01", "ads-dna",            "Extracts brand voice, audience, palette, positioning"],
  ["02", "ads-plan",           "Builds channel mix, funnel weights, KPI targets"],
  ["03", "ads-competitor",     "Maps competitor spend, formats, whitespace"],
  ["04", "ads-create",         "Generates angle-diverse copy concepts"],
  ["05", "ads-generate",       "Produces platform-sized ad images"],
  ["06", "platform adapters",  "Pushes to Meta, Google, TikTok, LinkedIn, MS, YouTube, Apple"],
  ["07", "ads-audit",          "Monitors 250+ checks · 15-minute cadence"],
  ["08", "ads-test",           "Designs A/Bs with statistical rigor"],
  ["09", "ads-budget",         "Reallocates spend under 70/20/10 + 3× kill rule"],
];

export default function HomePage() {
  return (
    <main>
      {/* HERO — asymmetric: copy left, live terminal right */}
      <section className="relative overflow-hidden bg-dawn">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="container relative pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <Badge variant="outline" className="mb-6">
                <span className="live-dot" />
                Design partners — 12 of 25 slots remaining
              </Badge>
              <h1 className="display text-4xl md:text-5xl lg:text-6xl text-balance text-foreground">
                The runtime for an
                <br />
                <span className="text-muted-foreground">AI ad organization.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-lg leading-relaxed text-pretty">
                Nineteen agents plan, launch, optimize, and scale campaigns across seven platforms.
                Experiment-native. Predictive before a dollar is spent.
              </p>
              <div className="mt-8 flex items-center gap-2">
                <Button asChild variant="secondary" size="lg">
                  <Link href="/onboarding">Start free <ArrowRight /></Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href="/platform">How it works</Link>
                </Button>
              </div>
            </div>
            <div className="lg:pl-8">
              <LiveDemoTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* LOGO STRIP — platform chips with brand colors */}
      <section className="hairline-t">
        <div className="container py-8 flex items-center gap-6 flex-wrap">
          <span className="eyebrow shrink-0">Integrated with</span>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <PlatformChip key={p} platform={p} />
            ))}
          </div>
        </div>
      </section>

      {/* AGENTS — asymmetric split: copy left, data table right */}
      <section className="hairline-t">
        <div className="container py-24 grid lg:grid-cols-[1fr_2fr] gap-12">
          <div>
            <span className="eyebrow">01 — The team</span>
            <h2 className="mt-4 text-3xl md:text-4xl display text-balance">
              Nineteen agents.
              <br />
              <span className="text-muted-foreground">Stable contracts.</span>
            </h2>
            <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
              Each agent has a single responsibility, a typed input schema, and a deterministic output contract.
              They compose into flows — autonomous, assisted, or enterprise-guarded.
            </p>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            {AGENTS_BY_CATEGORY.map((cat, i) => (
              <div key={cat.label} className={i === 0 ? "" : "hairline-t"}>
                <div className="flex items-center justify-between px-5 py-2.5 hairline-b bg-surface-1">
                  <span className="eyebrow">{cat.label}</span>
                  <span className="mono text-xs text-muted-foreground tabular">{cat.items.length}</span>
                </div>
                <div className="divide-y divide-border">
                  {cat.items.map((agent) => (
                    <div key={agent} className="flex items-center justify-between px-5 py-2.5 hover:bg-surface-1/50 transition-colors duration-150">
                      <span className="mono text-sm text-foreground">{agent}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="status-dot text-primary" />
                        ready
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES — 3-col grid, hairline dividers, not cards */}
      <section className="hairline-t">
        <div className="container py-24">
          <div className="max-w-2xl mb-16">
            <span className="eyebrow">02 — Why it&apos;s different</span>
            <h2 className="mt-4 text-3xl md:text-4xl display text-balance">
              Most &quot;AI ad tools&quot; automate.
              <br />
              <span className="text-muted-foreground">We orchestrate.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 border border-border rounded-lg overflow-hidden">
            {FEATURES.map((f, i) => {
              const isLastCol = (i + 1) % 3 === 0;
              const isLastRow = i >= 3;
              return (
                <div
                  key={f.title}
                  className={[
                    "p-6 lg:p-8 transition-colors duration-150 hover:bg-surface-1/60",
                    !isLastCol ? "lg:hairline-r" : "",
                    !isLastRow ? "hairline-b lg:hairline-b" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <span className="mono text-2xs text-muted-foreground mt-1 tabular">0{i + 1}</span>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{f.title}</h3>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{f.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WORKFLOW — sequential pipeline as table */}
      <section className="hairline-t">
        <div className="container py-24">
          <div className="max-w-2xl mb-12">
            <span className="eyebrow">03 — Closed-loop system</span>
            <h2 className="mt-4 text-3xl md:text-4xl display text-balance">
              Launch, test, learn, optimize,
              <br />
              <span className="text-muted-foreground">scale.</span>
            </h2>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            {WORKFLOW.map(([n, agent, desc], i) => (
              <div
                key={n}
                className={`grid grid-cols-[60px_180px_1fr] items-center px-5 py-3 hover:bg-surface-1/50 transition-colors duration-150 ${i > 0 ? "hairline-t" : ""}`}
              >
                <span className="mono text-2xs text-muted-foreground tabular">{n}</span>
                <span className="mono text-sm text-foreground">{agent}</span>
                <span className="text-sm text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING STRIP */}
      <section className="hairline-t">
        <div className="container py-24">
          <div className="max-w-2xl mb-12">
            <span className="eyebrow">04 — Pricing</span>
            <h2 className="mt-4 text-3xl md:text-4xl display text-balance">
              Flat subscription.
              <br />
              <span className="text-muted-foreground">No per-seat games.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 border border-border rounded-lg overflow-hidden">
            {[
              { name: "Starter",    price: "$499",   cap: "Up to $20k/mo ad spend",  perks: ["3 platforms", "5 active campaigns", "Weekly reports"] },
              { name: "Growth",     price: "$1,499", cap: "Up to $100k/mo ad spend", perks: ["All 7 platforms", "Unlimited campaigns", "A/B testing engine", "Daily reports"], featured: true },
              { name: "Enterprise", price: "Custom", cap: "Unlimited spend",         perks: ["SSO + SCIM", "Custom agents", "Dedicated success", "SLA-backed"] },
            ].map((t, i) => (
              <div key={t.name} className={`p-8 ${i > 0 ? "md:hairline-l" : ""} ${t.featured ? "bg-surface-1" : ""}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{t.name}</h3>
                  {t.featured && <Badge variant="solid">Popular</Badge>}
                </div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="display text-4xl text-foreground">{t.price}</span>
                  {t.price !== "Custom" && <span className="text-xs text-muted-foreground">/ mo</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.cap}</p>
                <Button asChild className="mt-6 w-full" variant={t.featured ? "secondary" : "subtle"}>
                  <Link href={t.name === "Enterprise" ? "/enterprise" : "/onboarding"}>
                    {t.name === "Enterprise" ? "Talk to sales" : "Start trial"}
                  </Link>
                </Button>
                <ul className="mt-6 space-y-2">
                  {t.perks.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-xs text-foreground/85">
                      <Check className="h-3 w-3 text-primary" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hairline-t">
        <div className="container py-32 text-center">
          <h2 className="display text-4xl md:text-5xl text-balance max-w-2xl mx-auto">
            Give your ads a team of <span className="text-muted-foreground">nineteen.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto">
            Fifteen minutes from signup to a multi-platform campaign planned, forecasted, and launched.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button asChild variant="secondary" size="lg">
              <Link href="/onboarding">Start free <ArrowRight /></Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/agents">See all 19 agents</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
