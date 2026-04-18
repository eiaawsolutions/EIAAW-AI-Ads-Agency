import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "About" };

const PRINCIPLES = [
  { n: "01", t: "Audit beats automation",   d: "An automated mistake is worse than a manual one. Every agent run is logged with input, output, model, tokens, and cost — replayable, exportable, defensible." },
  { n: "02", t: "Experiment-native",        d: "Every creative ships inside a designed A/B with sample size, significance, and a kill rule. We don't ship without a hypothesis we can disprove." },
  { n: "03", t: "Closed-loop learning",     d: "Experiment outcomes feed brand DNA. Brand DNA feeds creative. Creative feeds experiments. Each week the system gets smarter about your brand specifically." },
  { n: "04", t: "Bring your own ad accounts", d: "OAuth-based — your credentials, your data, your ad accounts. We never hold your spend wallet. Disconnect any time." },
  { n: "05", t: "Procurement-shaped",       d: "Multi-tenant DB isolation, encrypted token vault, AgentRun audit trail, daily cost circuit breaker. Built so the security review is short." },
  { n: "06", t: "Honest about platform GA",  d: "Meta is in GA. Google + LinkedIn in private preview. Others scaffolded. We caveat everything precisely — surprises don't survive a sales call." },
];

export default function AboutPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-16 md:pt-28">
          <span className="eyebrow">About</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            We&apos;re building the runtime for an
            <br />
            <span className="text-muted-foreground">AI ad organization.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Most &ldquo;AI ad tools&rdquo; automate one task. We orchestrate nineteen agents into a closed-loop
            system — strategy, creative, platform execution, audit, and budget reallocation — under one
            tenant-isolated runtime your security team can actually sign off on.
          </p>
        </div>
      </section>

      {/* MISSION */}
      <section className="container py-20">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-12">
          <div>
            <span className="eyebrow">Mission</span>
            <h2 className="mt-3 text-2xl md:text-3xl display">
              Make every dollar of ad spend
              <br />
              <span className="text-muted-foreground">defensible.</span>
            </h2>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            <p>
              The largest paid-media accounts in the world are operated by humans coordinating with
              spreadsheets and Slack. The smallest are operated by people who can&apos;t afford the humans.
              Both lose money to the same problems: creative fatigue masked by aggregated reporting,
              unfinished experiments, manual rebalancing that lags by weeks, and audit trails nobody can
              produce when finance asks.
            </p>
            <p>
              EIAAW is the runtime that treats those problems as engineering problems. Each agent has a
              single responsibility, a typed contract, a cost envelope, and a row in the audit log. They
              compose into flows that you can run autonomously, assisted, or under enterprise guardrails —
              but always under your audit trail and your budget caps.
            </p>
            <p>
              We&apos;re a small team based in Kuala Lumpur, Malaysia. We work with design partners across
              Southeast Asia, ANZ, and the United States. Our pricing scales with ad spend, not headcount,
              because the value should match the work the runtime is doing on your behalf.
            </p>
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="container hairline-t py-20">
        <span className="eyebrow">Operating principles</span>
        <h2 className="mt-3 text-2xl md:text-3xl display max-w-2xl">
          Six rules that show up
          <br />
          <span className="text-muted-foreground">in every commit.</span>
        </h2>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 border border-border rounded-lg overflow-hidden">
          {PRINCIPLES.map((p, i) => {
            const isLastCol = (i + 1) % 3 === 0;
            const isLastRow = i >= 3;
            return (
              <div
                key={p.n}
                className={[
                  "p-6 lg:p-8 transition-colors hover:bg-surface-1/60",
                  !isLastCol ? "lg:hairline-r" : "",
                  !isLastRow ? "hairline-b lg:hairline-b" : "",
                ].join(" ")}
              >
                <span className="mono text-2xs text-muted-foreground tabular">{p.n}</span>
                <h3 className="mt-3 text-sm font-medium text-foreground">{p.t}</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{p.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* COMPANY FACTS */}
      <section className="container hairline-t py-20">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-12">
          <div>
            <span className="eyebrow">The company</span>
            <h2 className="mt-3 text-2xl md:text-3xl display">
              EIAAW Solutions
            </h2>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            {[
              ["Founded",          "2026 · Kuala Lumpur, Malaysia"],
              ["Stage",            "Design-partner pilots · 12 of 25 slots taken"],
              ["Primary region",   "ap-southeast-1 (Singapore) on Railway"],
              ["Stack",            "Next.js 15 · Postgres 18 · Anthropic Opus + Haiku · Stripe · Cloudflare"],
              ["Focus",            "Performance advertising · multi-platform · experiment-native"],
              ["Hiring",           "Select pilot engineers — see /careers"],
            ].map(([k, v], i) => (
              <div key={k} className={`grid grid-cols-[160px_1fr] px-5 py-3 ${i > 0 ? "hairline-t" : ""}`}>
                <span className="eyebrow">{k}</span>
                <span className="text-sm text-foreground">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hairline-t mt-12">
        <div className="container py-24 text-center">
          <h2 className="display text-2xl md:text-3xl text-balance max-w-2xl mx-auto">
            Want to see how this ships
            <br />
            <span className="text-muted-foreground">on your account?</span>
          </h2>
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button asChild variant="secondary" size="lg">
              <Link href="/enterprise">Book architecture call</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/customers">See pilot outcomes</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
