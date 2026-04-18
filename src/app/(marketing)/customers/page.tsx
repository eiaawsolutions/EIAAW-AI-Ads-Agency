import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Metric = {
  label: string;
  before: string;
  after: string;
  delta: string;
  direction: "down" | "up";
};

type CaseStudy = {
  slug: string;
  category: string;
  region: string;
  size: string;
  spendBand: string;
  headline: string;
  challenge: string;
  approach: string[];
  metrics: Metric[];
  agentsUsed: string[];
  duration: string;
  outcome: string;
  pullQuote: string;
  pullAttribution: string;
};

const CASES: CaseStudy[] = [
  {
    slug: "dtc-skincare",
    category: "DTC skincare · sensitive-skin",
    region: "United States",
    size: "Series A · 18 employees",
    spendBand: "$48k/mo",
    headline: "From scattered Meta + Google to a closed-loop, experiment-native runtime.",
    challenge:
      "Two-person growth team running 9 always-on Meta campaigns and a flat Google Search account. CPA had drifted from $24 to $41 over the prior quarter while spend stayed flat — classic creative fatigue masked by aggregated reporting. No clean attribution to test against. The team's hypothesis was that they needed more creatives; the data showed they needed fewer, better-targeted ones.",
    approach: [
      "ads-dna mapped clinical-grade · sensitive-skin positioning + 4 audience personas with channel preferences.",
      "ads-competitor identified a creative whitespace — UGC with creator voiceover under-indexed in the category.",
      "ads-test designed two simultaneous A/Bs (proof headline vs benefit headline + UGC voiceover vs founder voiceover) at 90% power.",
      "ads-budget reallocated under the 70/20/10 rule — froze 4 fatigued ad sets, doubled the winning creative cluster.",
      "ads-audit ran 250 checks every 15 minutes; CAPI deduplication + frequency-cap fixes shipped in week 2.",
    ],
    metrics: [
      { label: "Blended CPA",      before: "$41", after: "$28", delta: "−32%",  direction: "down" },
      { label: "ROAS",              before: "2.4x", after: "3.6x", delta: "+50%", direction: "up" },
      { label: "Creative refresh",  before: "5 wks", after: "11 days", delta: "−74%", direction: "down" },
      { label: "Hours / week",      before: "22", after: "6",   delta: "−73%", direction: "down" },
    ],
    agentsUsed: ["ads-dna", "ads-competitor", "ads-test", "ads-budget", "ads-creative", "ads-audit", "ads-meta", "ads-google"],
    duration: "6 weeks · pilot",
    outcome:
      "ROAS recovered to pre-fatigue baseline within 4 weeks, then surpassed it by week 6. The 16-hour weekly time-saving freed the head of growth to start a Reddit + Threads test that's now their #2 creative source.",
    pullQuote:
      "We thought we needed a bigger team. We needed nineteen agents and the discipline to actually finish experiments. The terminal output is the audit trail our investors finally stopped asking for.",
    pullAttribution: "Head of Growth · Series A DTC brand",
  },
  {
    slug: "b2b-saas",
    category: "Vertical B2B SaaS · operations software",
    region: "Singapore + ANZ",
    size: "Series B · 60 employees",
    spendBand: "$92k/mo",
    headline: "LinkedIn pipeline that actually converts — under a single audit trail procurement could sign off on.",
    challenge:
      "Demand-gen team running LinkedIn Lead Gen + Meta retargeting + Google brand defense in three different platforms with three different attribution models. SQL volume was rising but pipeline conversion was falling — they were buying form fills, not buyers. Procurement had also flagged the patchwork of agency contractors as a SOC 2 audit risk.",
    approach: [
      "ads-dna locked positioning to the four buyer personas (Ops Director, Plant Manager, IT Manager, CFO) with separate hook libraries per role.",
      "ads-linkedin restructured Lead Gen forms — gated technical content for ICs, ungated business-case content for executives.",
      "ads-create produced 24 angle-diverse variants over 3 weeks; ads-test killed 17 in the first 10 days using one-tailed sequential testing.",
      "ads-landing flagged 3 message-mismatch issues on the post-click; copy aligned to ad headline within the same sprint.",
      "Multi-tenant audit trail (every AgentRun row signed with prompt version + cost) closed procurement's evidence ask in one meeting.",
    ],
    metrics: [
      { label: "Cost per SQL",         before: "$340", after: "$210", delta: "−38%",  direction: "down" },
      { label: "SQL → opportunity",    before: "11%",  after: "19%",  delta: "+73%",  direction: "up" },
      { label: "Pipeline / mo",        before: "$210k", after: "$385k", delta: "+83%", direction: "up" },
      { label: "Vendors in stack",     before: "5",    after: "1",    delta: "−80%",  direction: "down" },
    ],
    agentsUsed: ["ads-dna", "ads-linkedin", "ads-create", "ads-test", "ads-landing", "ads-meta", "ads-audit"],
    duration: "10 weeks · pilot",
    outcome:
      "First-meeting acceptance rate rose from 31% to 48% as creative finally matched persona. The Audit Log + AgentRun export satisfied internal compliance review and is now part of their SOC 2 evidence pack.",
    pullQuote:
      "Procurement's first question was \"who has access to our LinkedIn account.\" The second was \"can you show me the prompt that wrote that ad.\" Both had answers in the dashboard before the call ended.",
    pullAttribution: "VP Demand Gen · Series B B2B SaaS",
  },
];

export const metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-16 md:pt-28">
          <span className="eyebrow">Customers</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            What changed when teams
            <br />
            <span className="text-muted-foreground">stopped guessing.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Two pilot accounts under design-partner NDAs. Categories and regions named; brand identities held back.
            Numbers verified against ad-platform exports, not customer-reported.
          </p>
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <Badge variant="outline">
              <span className="status-dot text-primary" />
              Pilot · NDA-redacted
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              Methodology disclosed · brand identity withheld
            </Badge>
          </div>
        </div>
      </section>

      {/* STRIP — at-a-glance summary */}
      <section className="container mt-12">
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_140px_140px] items-center px-5 py-2.5 hairline-b bg-surface-1">
            <span className="eyebrow">Account</span>
            <span className="eyebrow">Spend / mo</span>
            <span className="eyebrow">Pilot length</span>
            <span className="eyebrow">Headline metric</span>
          </div>
          {CASES.map((c, i) => (
            <Link
              key={c.slug}
              href={`#${c.slug}`}
              className={`grid grid-cols-[1fr_140px_140px_140px] items-center px-5 py-3.5 hover:bg-surface-1/60 transition-colors ${i > 0 ? "hairline-t" : ""}`}
            >
              <span className="text-sm text-foreground">{c.category}</span>
              <span className="mono text-xs text-muted-foreground tabular">{c.spendBand}</span>
              <span className="mono text-xs text-muted-foreground">{c.duration.split(" · ")[0]}</span>
              <span className="text-xs">
                <span className="text-primary mono tabular">{c.metrics[0].delta}</span>{" "}
                <span className="text-muted-foreground">{c.metrics[0].label}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CASE STUDIES */}
      <section className="container space-y-32 mt-24">
        {CASES.map((c, idx) => (
          <CaseStudyBlock key={c.slug} c={c} index={idx} />
        ))}
      </section>

      {/* DISCLOSURE STRIP */}
      <section className="container mt-32">
        <div className="rounded-lg border border-border p-8 bg-surface-1">
          <span className="eyebrow">Methodology disclosure</span>
          <h2 className="mt-3 text-xl display max-w-2xl">
            How we report numbers.
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            <li>· Metrics pulled directly from Meta Ads Manager, Google Ads, and LinkedIn Campaign Manager exports — not customer-reported.</li>
            <li>· Time windows are 28-day rolling averages, comparing pilot end vs the 28 days before pilot start.</li>
            <li>· ROAS uses platform-reported revenue with CAPI/Conversions API deduplication enabled. Blended CPA includes paid + organic-search-driven conversions.</li>
            <li>· Customer identity withheld under design-partner NDAs. Reference calls available for qualified Enterprise prospects.</li>
            <li>· Past performance is not a guarantee — results depend on creative, offer, and category. We don&apos;t promise specific returns.</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="hairline-t mt-24">
        <div className="container py-24 text-center">
          <h2 className="display text-3xl md:text-4xl text-balance max-w-2xl mx-auto">
            Want a 30-day pilot
            <br />
            <span className="text-muted-foreground">with these mechanics on your account?</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Pilot terms are flat-fee, success-criteria-defined, and reversible. We start with one workspace and one brand.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button asChild variant="secondary" size="lg">
              <Link href="/enterprise">
                Book pilot scoping call <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/trust">View security posture</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function CaseStudyBlock({ c, index }: { c: CaseStudy; index: number }) {
  const num = String(index + 1).padStart(2, "0");
  return (
    <article id={c.slug} className="scroll-mt-20">
      {/* HEADER */}
      <div className="grid lg:grid-cols-[1fr_2fr] gap-8 lg:gap-16">
        <div>
          <span className="eyebrow">Case {num}</span>
          <h2 className="mt-3 text-2xl md:text-3xl display text-balance">
            {c.headline}
          </h2>
          <div className="mt-6 rounded-lg border border-border overflow-hidden">
            {[
              ["Category", c.category],
              ["Region",   c.region],
              ["Stage",    c.size],
              ["Spend",    c.spendBand],
              ["Duration", c.duration],
            ].map(([k, v], i) => (
              <div key={k} className={`grid grid-cols-[100px_1fr] px-5 py-2.5 text-xs ${i > 0 ? "hairline-t" : ""}`}>
                <span className="eyebrow">{k}</span>
                <span className="text-foreground">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* METRICS GRID */}
        <div>
          <span className="eyebrow">Outcomes</span>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {c.metrics.map((m) => (
              <div key={m.label} className="rounded-lg border border-border p-5 bg-card">
                <span className="eyebrow">{m.label}</span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="display text-3xl text-foreground tabular">{m.after}</span>
                  <span className={`mono text-xs flex items-center gap-1 ${m.direction === "down" ? "text-primary" : "text-primary"}`}>
                    {m.direction === "down" ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {m.delta}
                  </span>
                </div>
                <div className="mt-1 mono text-2xs text-muted-foreground tabular">
                  was {m.before}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHALLENGE / APPROACH / OUTCOME */}
      <div className="mt-16 grid lg:grid-cols-3 gap-8 lg:gap-12">
        <div>
          <span className="eyebrow">The challenge</span>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {c.challenge}
          </p>
        </div>
        <div>
          <span className="eyebrow">What we ran</span>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground leading-relaxed">
            {c.approach.map((step, i) => (
              <li key={i} className="grid grid-cols-[24px_1fr] gap-2">
                <span className="mono text-2xs text-muted-foreground/70 tabular pt-1">{String(i + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="eyebrow">The outcome</span>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {c.outcome}
          </p>
          <div className="mt-6">
            <span className="eyebrow">Agents used</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.agentsUsed.map((a) => (
                <span
                  key={a}
                  className="mono text-2xs text-muted-foreground bg-surface-1 border border-border rounded px-2 py-0.5"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PULL QUOTE */}
      <blockquote className="mt-12 rounded-lg border border-border p-8 lg:p-10 bg-surface-1">
        <p className="display text-xl md:text-2xl text-foreground text-balance leading-snug">
          &ldquo;{c.pullQuote}&rdquo;
        </p>
        <footer className="mt-4 eyebrow text-muted-foreground">
          {c.pullAttribution}
        </footer>
      </blockquote>
    </article>
  );
}
