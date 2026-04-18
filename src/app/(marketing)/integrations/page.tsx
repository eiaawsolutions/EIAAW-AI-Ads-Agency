import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlatformChip } from "@/components/platform/chip";

type Status = "ga" | "preview" | "scaffolded";

type Integration = {
  key: string;
  name: string;
  status: Status;
  scopes: string[];
  capabilities: string[];
  notes: string;
};

const INTEGRATIONS: Integration[] = [
  {
    key: "meta",
    name: "Meta Ads (Facebook + Instagram)",
    status: "ga",
    scopes: ["ads_management", "ads_read", "business_management", "pages_read_engagement"],
    capabilities: ["OAuth login", "Ad-account picker", "Campaign / ad set / ad CRUD", "Insights pull", "CAPI dedup"],
    notes: "First production adapter. Token refresh + encryption at rest live; Pixel + CAPI deduplication enabled.",
  },
  {
    key: "google",
    name: "Google Ads",
    status: "preview",
    scopes: ["adwords"],
    capabilities: ["OAuth login", "MCC + sub-account binding", "Search + PMax campaign launch", "Conversion import"],
    notes: "Private preview this quarter — Enterprise pilots can request priority access.",
  },
  {
    key: "linkedin",
    name: "LinkedIn Ads",
    status: "preview",
    scopes: ["r_ads", "r_ads_reporting", "rw_ads"],
    capabilities: ["OAuth login", "Campaign Manager binding", "Lead Gen Forms", "ABM audience push"],
    notes: "Private preview this quarter. B2B pilot accounts prioritized.",
  },
  {
    key: "tiktok",
    name: "TikTok Ads",
    status: "scaffolded",
    scopes: ["user.info.basic", "ads.management"],
    capabilities: ["Adapter scaffold", "Auth flow stub", "Smart+ campaign types", "TikTok Shop hooks"],
    notes: "Adapter scaffolded — wiring follows Meta playbook. Roadmap landing this quarter.",
  },
  {
    key: "microsoft",
    name: "Microsoft Ads (Bing + Audience)",
    status: "scaffolded",
    scopes: ["ads.management"],
    capabilities: ["Adapter scaffold", "Google import validation", "Copilot integration hooks"],
    notes: "Adapter scaffolded. Strong fit for accounts already running Google import workflows.",
  },
  {
    key: "youtube",
    name: "YouTube Ads",
    status: "scaffolded",
    scopes: ["adwords"],
    capabilities: ["Adapter scaffold", "Demand Gen + skippable", "Shorts ads", "Connected TV"],
    notes: "Shares Google Ads OAuth surface — wiring follows GA push.",
  },
  {
    key: "apple",
    name: "Apple Ads",
    status: "scaffolded",
    scopes: ["search-ads"],
    capabilities: ["Adapter scaffold", "Custom Product Pages", "MMP attribution", "TAP coverage"],
    notes: "Mobile-app advertisers only. Roadmap aligned with iOS app pilots.",
  },
];

export const metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-16 md:pt-28">
          <span className="eyebrow">Integrations</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            Seven platforms.
            <br />
            <span className="text-muted-foreground">Honest status on each.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            We list what&apos;s in GA, what&apos;s in private preview, and what&apos;s scaffolded but not yet
            wired. Strategy and creative agents are platform-agnostic and work across all seven today.
          </p>
        </div>
      </section>

      {/* MATRIX */}
      <section id="matrix" className="container py-16">
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[200px_120px_1fr] items-center px-5 py-2.5 hairline-b bg-surface-1">
            <span className="eyebrow">Platform</span>
            <span className="eyebrow">Status</span>
            <span className="eyebrow">Capability</span>
          </div>
          {INTEGRATIONS.map((i) => (
            <Link
              key={i.key}
              href={`#${i.key}`}
              className="grid grid-cols-[200px_120px_1fr] items-center px-5 py-3.5 hairline-t hover:bg-surface-1/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <PlatformChip platform={i.key} />
              </span>
              <span><StatusBadge status={i.status} /></span>
              <span className="text-xs text-muted-foreground truncate">{i.notes}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* DEEP DIVES */}
      <section className="container space-y-16 py-12">
        {INTEGRATIONS.map((i) => (
          <article key={i.key} id={i.key} className="scroll-mt-20 grid lg:grid-cols-[1fr_2fr] gap-8 lg:gap-12">
            <div>
              <PlatformChip platform={i.key} />
              <h2 className="mt-3 text-xl md:text-2xl display text-foreground">{i.name}</h2>
              <div className="mt-3"><StatusBadge status={i.status} /></div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{i.notes}</p>
            </div>
            <div className="space-y-6">
              <div>
                <span className="eyebrow">OAuth scopes</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {i.scopes.map((s) => (
                    <span key={s} className="mono text-2xs text-muted-foreground bg-surface-1 border border-border rounded px-2 py-0.5">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="eyebrow">Capabilities</span>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {i.capabilities.map((c) => (
                    <li key={c} className="grid grid-cols-[16px_1fr] gap-2">
                      <span className="text-primary">·</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* ROADMAP CTA */}
      <section id="roadmap" className="hairline-t mt-16 scroll-mt-20">
        <div className="container py-20 text-center">
          <h2 className="display text-2xl md:text-3xl text-balance max-w-2xl mx-auto">
            Need a connector prioritized?
            <br />
            <span className="text-muted-foreground">Enterprise pilots can move the queue.</span>
          </h2>
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button asChild variant="secondary" size="lg">
              <Link href="/enterprise">Request priority</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/agents">See platform-agnostic agents</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "ga") {
    return (
      <Badge variant="outline" className="text-2xs">
        <span className="status-dot text-primary" /> GA
      </Badge>
    );
  }
  if (status === "preview") {
    return (
      <Badge variant="outline" className="text-2xs text-amber-400 border-amber-400/30">
        <span className="status-dot text-amber-400" /> Private preview
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-2xs text-muted-foreground">
      Scaffolded
    </Badge>
  );
}
