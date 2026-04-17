import Link from "next/link";
import { ArrowRight, Activity, Atom, BarChart3, Beaker, Brain, CircleDot, FlaskConical, Gauge, LineChart, Sparkles, Target, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const PLATFORMS = [
  { name: "Meta", code: "META" },
  { name: "Google Ads", code: "GOOG" },
  { name: "TikTok", code: "TTOK" },
  { name: "LinkedIn", code: "LNKD" },
  { name: "Microsoft", code: "MSFT" },
  { name: "YouTube", code: "YTUB" },
  { name: "Apple Ads", code: "APPL" },
];

const AGENTS = [
  { group: "Strategy", items: ["ads-dna", "ads-plan", "ads-create", "ads-math", "ads-budget"] },
  { group: "Platform", items: ["ads-meta", "ads-google", "ads-tiktok", "ads-linkedin", "ads-microsoft", "ads-youtube", "ads-apple"] },
  { group: "Cross-functional", items: ["ads-audit", "ads-creative", "ads-competitor", "ads-landing", "ads-test"] },
  { group: "Creative", items: ["ads-generate", "ads-photoshoot"] },
];

export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <div className="container relative pt-24 pb-32 md:pt-32 md:pb-40">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/5 px-3.5 py-1.5 text-xs">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-400" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-brand-400" />
              </span>
              <span className="mono-tag text-brand-200">Multi-agent ads OS · v0.1</span>
            </div>
            <h1 className="mt-8 text-balance text-5xl md:text-7xl font-semibold tracking-tight leading-[1.02]">
              <span className="text-gradient">An AI organization</span>
              <br />
              <span className="text-foreground/90">that runs your ads.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              Nineteen specialized agents plan, launch, optimize, and scale campaigns across seven platforms.
              Experiment-native by default. Predictive before a dollar is spent.
              <span className="text-foreground/80"> Benchmarked to outperform market averages.</span>
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="gradient">
                <Link href="/onboarding">Launch your first campaign <ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/platform">See the platform</Link>
              </Button>
            </div>

            <div className="mt-16 grid grid-cols-3 md:grid-cols-6 gap-4">
              {[
                ["19", "Agents"],
                ["7", "Platforms"],
                ["250+", "Audit checks"],
                ["3x", "Kill rule"],
                ["95%", "Confidence"],
                ["24/7", "Autonomous"],
              ].map(([n, label]) => (
                <div key={label} className="text-left">
                  <div className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient">{n}</div>
                  <div className="mt-1 text-xs text-muted-foreground uppercase tracking-[0.14em]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Platform logos row */}
        <div className="container pb-16">
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-6">
            <span className="mono-tag">Integrated with</span>
            <span className="h-px flex-1 bg-white/5" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {PLATFORMS.map((p) => (
              <div key={p.code} className="glass rounded-lg px-4 py-5 flex items-center justify-between">
                <span className="text-sm font-medium">{p.name}</span>
                <span className="font-mono text-[10px] text-brand-400">{p.code}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="section border-t border-white/5">
        <div className="container">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
            <div>
              <Badge>01 · Closed-loop system</Badge>
              <h2 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-balance max-w-2xl">
                Launch → Test → Learn → Optimize → <span className="text-gradient">Scale</span>
              </h2>
            </div>
            <p className="text-muted-foreground max-w-md">
              Every campaign runs through the same agentic pipeline. Outputs from one agent become
              inputs to the next — with a persistent memory layer closing the loop.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { n: "01", icon: Atom, t: "Brand DNA", d: "ads-dna extracts voice, audience, palette, and positioning." },
              { n: "02", icon: Workflow, t: "Strategy", d: "ads-plan builds the channel mix, funnel, and KPIs." },
              { n: "03", icon: Target, t: "Competitor Intel", d: "ads-competitor maps spend, formats, and whitespace." },
              { n: "04", icon: Sparkles, t: "Creative", d: "ads-create + ads-generate produce platform-sized variants." },
              { n: "05", icon: Zap, t: "Launch", d: "Platform agents push to Meta, Google, TikTok, LinkedIn, MS, YouTube, Apple." },
              { n: "06", icon: Beaker, t: "Experiment", d: "ads-test designs A/Bs with statistical significance built in." },
              { n: "07", icon: Gauge, t: "Predict", d: "ads-math forecasts CPA, ROAS, and budget outcomes." },
              { n: "08", icon: LineChart, t: "Scale", d: "ads-budget reallocates spend under 70/20/10 + 3× kill rule." },
            ].map((s) => (
              <Card key={s.n} className="p-6 hover:border-brand-500/30 transition-colors group">
                <div className="flex items-center justify-between">
                  <s.icon className="h-5 w-5 text-brand-400" />
                  <span className="font-mono text-[10px] text-muted-foreground">{s.n}</span>
                </div>
                <h3 className="mt-6 text-base font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AGENTS GRID */}
      <section className="section border-t border-white/5">
        <div className="container">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
            <div>
              <Badge>02 · The team</Badge>
              <h2 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-balance max-w-2xl">
                Nineteen agents. <span className="text-gradient">One organization.</span>
              </h2>
            </div>
            <p className="text-muted-foreground max-w-md">
              Each agent has a single responsibility and a deterministic contract. Strategy agents set direction,
              platform agents execute, cross-functional agents observe, and creative agents produce assets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AGENTS.map((g) => (
              <Card key={g.group} className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold tracking-tight">{g.group}</h3>
                  <span className="mono-tag">{g.items.length} agents</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((a) => (
                    <div key={a} className="font-mono text-xs px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-white/5 text-brand-200">
                      {a}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* DIFFERENTIATORS */}
      <section className="section border-t border-white/5">
        <div className="container">
          <Badge>03 · Why it&apos;s different</Badge>
          <h2 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-balance max-w-3xl">
            Most &quot;AI ad tools&quot; automate. We <span className="text-gradient">orchestrate.</span>
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Brain, t: "Multi-agent orchestration", d: "Not a single model answering prompts — a coordinated team with roles, memory, and escalation paths." },
              { icon: FlaskConical, t: "Experiment-native", d: "A/B testing is a first-class runtime, not a setting. Every creative ships inside a designed experiment." },
              { icon: Activity, t: "Predictive budgeting", d: "Simulate CPA/ROAS scenarios before a single dollar is spent. Three forecast bands per launch." },
              { icon: CircleDot, t: "Closed-loop learning", d: "Results from ads-test feed ads-create and ads-dna. Each week the system gets smarter about your brand." },
              { icon: BarChart3, t: "Cross-platform intelligence", d: "Signals sync across Meta, Google, TikTok, LinkedIn, MS, YouTube, Apple. One brand truth, seven execution surfaces." },
              { icon: Gauge, t: "Transparent telemetry", d: "Every agent run is persisted with token usage, cost, and output. No black boxes. Full audit trail." },
            ].map((f) => (
              <Card key={f.t} className="p-6">
                <f.icon className="h-5 w-5 text-brand-400" />
                <h3 className="mt-6 text-base font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="section border-t border-white/5">
        <div className="container">
          <Badge>04 · Plans</Badge>
          <h2 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-balance max-w-3xl">
            Scale with your spend. <span className="text-gradient">Never per-seat.</span>
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Starter", price: "$499", tag: "Up to $20k/mo ad spend", perks: ["3 platforms", "5 active campaigns", "Weekly reports", "Community support"] },
              { name: "Growth", price: "$1,499", tag: "Up to $100k/mo ad spend", perks: ["All 7 platforms", "Unlimited campaigns", "Daily reports", "A/B testing engine", "Priority support"], featured: true },
              { name: "Enterprise", price: "Custom", tag: "Unlimited spend", perks: ["Custom agents", "SSO + SCIM", "Dedicated success", "SLA-backed"] },
            ].map((p) => (
              <Card key={p.name} className={`p-6 ${p.featured ? "glow border-brand-500/30" : ""}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{p.name}</h3>
                  {p.featured && <Badge>Most teams pick this</Badge>}
                </div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold text-gradient">{p.price}</span>
                  {p.price !== "Custom" && <span className="text-muted-foreground text-sm">/mo</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.tag}</p>
                <ul className="mt-6 space-y-2.5">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm text-foreground/85">
                      <CircleDot className="h-3.5 w-3.5 text-brand-400" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-8 w-full" variant={p.featured ? "gradient" : "secondary"}>
                  <Link href="/onboarding">Start trial</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section border-t border-white/5">
        <div className="container">
          <div className="glass rounded-2xl p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-radial opacity-80" />
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-balance">
                Give your ads a <span className="text-gradient">team of nineteen.</span>
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                Fifteen minutes from signup to a multi-platform campaign predicted, planned, and launched.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" variant="gradient">
                  <Link href="/onboarding">Start free trial <ArrowRight /></Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/platform">Book a demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
