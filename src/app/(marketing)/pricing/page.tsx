import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const TIERS = [
  {
    name: "Starter",
    price: "$499",
    tag: "For SMEs spending up to $20k/mo",
    perks: [
      "3 platforms (choose any)",
      "5 active campaigns",
      "Weekly AI reports",
      "ads-dna, ads-plan, ads-create, ads-math",
      "Community Slack",
    ],
  },
  {
    name: "Growth",
    price: "$1,499",
    tag: "For scaling brands spending up to $100k/mo",
    featured: true,
    perks: [
      "All 7 platforms",
      "Unlimited campaigns",
      "Daily AI reports + Slack alerts",
      "A/B testing engine (ads-test)",
      "Creative generation (ads-generate + ads-photoshoot)",
      "Priority support (24h SLA)",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    tag: "For agencies & in-house teams",
    perks: [
      "Unlimited spend and workspaces",
      "SSO + SCIM provisioning",
      "Custom agent development",
      "Dedicated Success Engineer",
      "SOC 2 Type II, DPA, custom SLAs",
    ],
  },
];

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <main className="container py-24">
      <Badge>Pricing</Badge>
      <h1 className="mt-4 text-5xl md:text-6xl font-semibold tracking-tight text-balance max-w-3xl">
        Flat subscription. <span className="text-gradient">No per-seat games.</span>
      </h1>
      <p className="mt-4 text-muted-foreground max-w-2xl">
        Pricing scales with ad spend, not headcount. Invite unlimited strategists, analysts, and viewers.
      </p>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((t) => (
          <Card key={t.name} className={`p-8 ${t.featured ? "glow border-brand-500/30" : ""}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.name}</h2>
              {t.featured && <Badge>Most teams pick this</Badge>}
            </div>
            <div className="mt-8 flex items-baseline gap-1">
              <span className="text-5xl font-semibold text-gradient">{t.price}</span>
              {t.price !== "Custom" && <span className="text-muted-foreground text-sm">/mo</span>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t.tag}</p>
            <Button asChild className="mt-8 w-full" variant={t.featured ? "gradient" : "secondary"}>
              <Link href="/onboarding">Start 14-day trial</Link>
            </Button>
            <ul className="mt-8 space-y-3">
              {t.perks.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-foreground/85">
                  <Check className="h-4 w-4 mt-0.5 text-brand-400 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <p className="mt-12 text-xs text-muted-foreground max-w-2xl">
        * Performance-optimized campaigns driven by predictive AI, benchmarked to outperform market
        averages. Results vary by category, creative quality, and offer fit — we do not guarantee
        specific returns.
      </p>
    </main>
  );
}
