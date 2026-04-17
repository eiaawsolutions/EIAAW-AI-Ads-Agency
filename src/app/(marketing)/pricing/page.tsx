import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TIERS = [
  {
    name: "Starter",
    price: "$499",
    cap: "SMEs spending up to $20k/mo",
    perks: [
      "3 platforms",
      "5 active campaigns",
      "Weekly AI reports",
      "Strategy agents · dna, plan, create, math",
      "Community Slack",
    ],
  },
  {
    name: "Growth",
    price: "$1,499",
    cap: "Scaling brands spending up to $100k/mo",
    featured: true,
    perks: [
      "All 7 platforms",
      "Unlimited campaigns",
      "A/B testing engine (ads-test)",
      "Creative generation (ads-generate + photoshoot)",
      "Daily AI reports + Slack alerts",
      "Priority support · 24h SLA",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cap: "Agencies & in-house teams",
    perks: [
      "Unlimited spend and workspaces",
      "SSO + SCIM provisioning",
      "Custom agent development",
      "Dedicated Success Engineer",
      "SOC 2 Type II, DPA, custom SLAs",
    ],
  },
];

const FAQ = [
  ["Do you guarantee results?", "No. We build performance-optimized campaigns driven by predictive AI and benchmarked to outperform market averages. Results depend on creative, offer, and category."],
  ["Can I bring my own ad accounts?", "Yes. We use OAuth — your credentials, your data, your ad accounts. Tokens are encrypted at rest."],
  ["Which platforms are supported today?", "All 7 adapters ship in the beta: Meta, Google Ads, TikTok, LinkedIn, Microsoft, YouTube, Apple Ads. Real API wiring is rolling out one platform at a time — Meta is first."],
  ["What happens after the 14-day trial?", "Your workspace stays read-only if you don't subscribe. You can export everything. Nothing is deleted for 90 days."],
];

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-16 md:pt-28">
          <span className="eyebrow">Pricing</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            Flat subscription.
            <br />
            <span className="text-muted-foreground">No per-seat games.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Pricing scales with ad spend, not headcount. Invite unlimited strategists, analysts, and viewers on every tier.
          </p>
        </div>
      </section>

      <section className="container">
        <div className="grid md:grid-cols-3 border border-border rounded-lg overflow-hidden">
          {TIERS.map((t, i) => (
            <div key={t.name} className={`p-8 md:p-10 ${i > 0 ? "md:hairline-l" : ""} ${t.featured ? "bg-surface-1" : ""}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">{t.name}</h2>
                {t.featured && <Badge variant="solid">Most teams pick this</Badge>}
              </div>
              <div className="mt-8 flex items-baseline gap-1">
                <span className="display text-5xl text-foreground">{t.price}</span>
                {t.price !== "Custom" && <span className="text-xs text-muted-foreground">/ mo</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t.cap}</p>
              <Button asChild className="mt-8 w-full" variant={t.featured ? "secondary" : "subtle"}>
                <Link href="/onboarding">Start 14-day trial</Link>
              </Button>
              <ul className="mt-8 space-y-2.5">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-foreground/85">
                    <Check className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FEATURE MATRIX */}
        <div className="mt-24">
          <span className="eyebrow">What&apos;s included</span>
          <h2 className="mt-4 text-2xl md:text-3xl display max-w-2xl">
            Every tier ships with the full agent roster.
            <br />
            <span className="text-muted-foreground">Tiers differ in scale and support.</span>
          </h2>
          <div className="mt-10 rounded-lg border border-border overflow-hidden">
            {[
              ["19 agents",                 "✓", "✓", "✓"],
              ["Multi-tenant workspace",    "✓", "✓", "✓"],
              ["Audit trail",               "✓", "✓", "✓"],
              ["Experiment engine",         "—", "✓", "✓"],
              ["Creative generation",       "—", "✓", "✓"],
              ["Daily AI reports",          "—", "✓", "✓"],
              ["SSO / SCIM",                "—", "—", "✓"],
              ["Custom agents",             "—", "—", "✓"],
              ["Dedicated success",         "—", "—", "✓"],
            ].map((row, i) => (
              <div key={row[0]} className={`grid grid-cols-[2fr_1fr_1fr_1fr] items-center px-5 py-3 ${i > 0 ? "hairline-t" : "bg-surface-1"}`}>
                <span className={i === 0 ? "eyebrow" : "text-sm text-foreground"}>{row[0]}</span>
                {row.slice(1).map((v, j) => (
                  <span key={j} className={`text-sm text-center ${v === "✓" ? "text-primary" : "text-muted-foreground/50"}`}>
                    {v}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-32 grid lg:grid-cols-[1fr_2fr] gap-12">
          <div>
            <span className="eyebrow">FAQ</span>
            <h2 className="mt-4 text-2xl md:text-3xl display">
              Answers.
              <br />
              <span className="text-muted-foreground">Not marketing.</span>
            </h2>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            {FAQ.map(([q, a], i) => (
              <div key={q} className={`px-6 py-6 ${i > 0 ? "hairline-t" : ""}`}>
                <h3 className="text-sm font-medium text-foreground">{q}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-12 text-2xs text-muted-foreground max-w-2xl leading-relaxed">
          * Performance-optimized campaigns driven by predictive AI, benchmarked to outperform market averages.
          Results vary by category, creative quality, and offer fit — we do not guarantee specific returns.
        </p>
      </section>
    </main>
  );
}
