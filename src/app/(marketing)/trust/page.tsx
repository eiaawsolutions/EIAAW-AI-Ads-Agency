import Link from "next/link";
import { Lock, ShieldCheck, FileText, Activity, Server, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const POSTURE = [
  ["Multi-tenant isolation",       "Postgres RLS + SET LOCAL app.current_org_id per request",                  "live"],
  ["Encryption in transit",         "TLS 1.3 at the edge, HSTS preload, automatic cert rotation",               "live"],
  ["Encryption at rest (secrets)",  "AES-256-GCM envelope; per-env key in EIAAW_ENCRYPTION_KEY",                "live"],
  ["OAuth token vault",             "Provider tokens encrypted with v1: version prefix, rotatable",             "live"],
  ["Audit trail per AI run",        "AgentRun: input, output, model, tokens, cost, prompt version",             "live"],
  ["Cost circuit breakers",         "Daily AI-cost cap per org with hard 402 enforcement",                       "live"],
  ["Rate limiting",                 "Per-org per-agent and per-IP auth limits (Upstash Redis sliding window)",  "live"],
  ["Pen-test readiness",            "OWASP Top 10 mapped, no version headers, no debug pages in prod",          "live"],
  ["SOC 2 Type II",                 "Audit prep underway with target Q3 2026 attestation",                       "in-progress"],
  ["ISO 27001",                     "Roadmap — driven by enterprise customer demand",                            "planned"],
] as const;

const SUB_PROCESSORS = [
  { name: "Anthropic",      purpose: "AI inference (Claude Opus 4.7, Haiku 4.5)", region: "United States",     attestations: "SOC 2 Type II, ISO 27001" },
  { name: "Railway",        purpose: "Application hosting + Postgres",            region: "ap-southeast-1 (Singapore)", attestations: "SOC 2 Type II" },
  { name: "Cloudflare",     purpose: "Edge / CDN / WAF / DDoS",                    region: "Global anycast",     attestations: "SOC 2 Type II, ISO 27001, PCI DSS" },
  { name: "Stripe",         purpose: "Subscription billing + invoicing",          region: "United States, EU",   attestations: "PCI DSS Level 1, SOC 1/2, ISO 27001" },
  { name: "Upstash",        purpose: "Rate-limit state (Redis)",                  region: "Selectable per env",  attestations: "SOC 2 Type II" },
  { name: "GitHub",         purpose: "Source control + CI",                       region: "United States",      attestations: "SOC 2 Type II, ISO 27001" },
];

const ENCRYPTION = [
  ["In transit",    "TLS 1.3 (HSTS preload)",      "Cloudflare → origin re-encrypted"],
  ["At rest",       "AES-256-GCM (envelope)",      "12-byte nonce, 16-byte auth tag, base64 wire format"],
  ["Key source",    "EIAAW_ENCRYPTION_KEY env",     "32-byte hex per environment"],
  ["Key rotation",  "v1: prefix on ciphertext",     "Rotation without migration"],
  ["DB at rest",    "Provider-managed (Railway)",   "Disk-level encryption + automated backups"],
  ["Backups",       "Daily snapshot, 7-day retention", "Restore tested quarterly"],
];

const INCIDENT = [
  ["Severity 1 — confirmed breach",    "Customer notification within 24 hours",   "Initial postmortem within 5 business days"],
  ["Severity 2 — service degradation", "Status page update within 15 min",         "Resolution comms within 1 hour"],
  ["Severity 3 — partial impact",      "Status page update within 1 hour",         "Resolution comms within 4 hours"],
  ["Vulnerability disclosure",         "security@eiaawsolutions.com (PGP soon)",   "Triage within 2 business days"],
];

export const metadata = { title: "Trust" };

export default function TrustPage() {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-16 md:pt-28">
          <span className="eyebrow">Trust center</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            How we earn the right
            <br />
            <span className="text-muted-foreground">to your ad spend.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Security posture, sub-processors, encryption details, incident response, and the materials your procurement team will ask for.
            Updated as we ship.
          </p>
          <div className="mt-8 flex items-center gap-2">
            <Button asChild variant="secondary" size="lg">
              <Link href="/enterprise">Request DPA &amp; security pack</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href="https://status.eiaawsolutions.com" target="_blank" rel="noreferrer">
                <Activity /> Status page
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* QUICK SECTION JUMPS */}
      <section className="container mt-12">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="eyebrow shrink-0">On this page</span>
          {[
            ["Posture", "#posture"],
            ["Sub-processors", "#sub-processors"],
            ["Encryption", "#encryption"],
            ["Incident response", "#incident-response"],
            ["DPA", "#dpa"],
            ["Compliance roadmap", "#roadmap"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* POSTURE */}
      <section id="posture" className="container mt-20 scroll-mt-20">
        <div className="flex items-start gap-4 mb-8">
          <ShieldCheck className="text-primary mt-1 h-5 w-5" />
          <div>
            <span className="eyebrow">01</span>
            <h2 className="mt-1 text-2xl md:text-3xl display">
              Security posture
              <span className="text-muted-foreground"> — what&apos;s live today.</span>
            </h2>
          </div>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          {POSTURE.map(([title, detail, status], i) => (
            <div key={title} className={`grid grid-cols-[1fr_2fr_120px] items-center gap-4 px-5 py-3.5 ${i > 0 ? "hairline-t" : ""}`}>
              <span className="text-sm text-foreground">{title}</span>
              <span className="text-xs text-muted-foreground">{detail}</span>
              <span className="justify-self-end">
                <StatusBadge status={status} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* SUB-PROCESSORS */}
      <section id="sub-processors" className="container mt-24 scroll-mt-20">
        <div className="flex items-start gap-4 mb-8">
          <Server className="text-primary mt-1 h-5 w-5" />
          <div>
            <span className="eyebrow">02</span>
            <h2 className="mt-1 text-2xl md:text-3xl display">
              Sub-processors
              <span className="text-muted-foreground"> — every vendor that touches your data.</span>
            </h2>
          </div>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[160px_1fr_180px_220px] items-center px-5 py-2.5 hairline-b bg-surface-1">
            <span className="eyebrow">Vendor</span>
            <span className="eyebrow">Purpose</span>
            <span className="eyebrow">Region</span>
            <span className="eyebrow">Attestations</span>
          </div>
          {SUB_PROCESSORS.map((s, i) => (
            <div key={s.name} className={`grid grid-cols-[160px_1fr_180px_220px] items-center px-5 py-3.5 ${i > 0 ? "hairline-t" : ""}`}>
              <span className="text-sm text-foreground">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.purpose}</span>
              <span className="mono text-xs text-muted-foreground">{s.region}</span>
              <span className="text-xs text-muted-foreground">{s.attestations}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-2xs text-muted-foreground leading-relaxed max-w-3xl">
          We notify enterprise customers at least 30 days before adding a new sub-processor that processes regulated data.
          A current sub-processor list is always available at this URL.
        </p>
      </section>

      {/* ENCRYPTION */}
      <section id="encryption" className="container mt-24 scroll-mt-20">
        <div className="flex items-start gap-4 mb-8">
          <KeyRound className="text-primary mt-1 h-5 w-5" />
          <div>
            <span className="eyebrow">03</span>
            <h2 className="mt-1 text-2xl md:text-3xl display">
              Encryption
              <span className="text-muted-foreground"> — in transit and at rest.</span>
            </h2>
          </div>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          {ENCRYPTION.map(([k, v, note], i) => (
            <div key={k} className={`grid grid-cols-[160px_240px_1fr] gap-4 items-center px-5 py-3.5 ${i > 0 ? "hairline-t" : ""}`}>
              <span className="eyebrow">{k}</span>
              <span className="mono text-sm text-foreground">{v}</span>
              <span className="text-xs text-muted-foreground">{note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* INCIDENT RESPONSE */}
      <section id="incident-response" className="container mt-24 scroll-mt-20">
        <div className="flex items-start gap-4 mb-8">
          <Lock className="text-primary mt-1 h-5 w-5" />
          <div>
            <span className="eyebrow">04</span>
            <h2 className="mt-1 text-2xl md:text-3xl display">
              Incident response
              <span className="text-muted-foreground"> — what we do when things go wrong.</span>
            </h2>
          </div>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-4 items-center px-5 py-2.5 hairline-b bg-surface-1">
            <span className="eyebrow">Severity</span>
            <span className="eyebrow">First action</span>
            <span className="eyebrow">Follow-up</span>
          </div>
          {INCIDENT.map(([sev, first, follow], i) => (
            <div key={sev} className={`grid grid-cols-[1fr_1fr_1fr] gap-4 items-center px-5 py-3.5 ${i > 0 ? "hairline-t" : ""}`}>
              <span className="text-sm text-foreground">{sev}</span>
              <span className="text-xs text-muted-foreground">{first}</span>
              <span className="text-xs text-muted-foreground">{follow}</span>
            </div>
          ))}
        </div>
      </section>

      {/* DPA */}
      <section id="dpa" className="container mt-24 scroll-mt-20">
        <div className="rounded-lg border border-border p-8 lg:p-12 bg-surface-1">
          <div className="flex items-start gap-4">
            <FileText className="text-primary mt-1 h-5 w-5" />
            <div className="max-w-3xl">
              <span className="eyebrow">05</span>
              <h2 className="mt-1 text-2xl md:text-3xl display">
                Data Processing Addendum
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Our DPA is built on the EU Standard Contractual Clauses (2021) with a UK Addendum and a Malaysia PDPA module.
                It covers sub-processor flow-down, breach notification, audit rights, sub-processor changes, and data subject request handling.
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                We can sign your DPA where it&apos;s materially equivalent. For unique requirements, the Success Engineer team handles redlines directly.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <Button asChild variant="secondary">
                  <Link href="/enterprise">Request DPA</Link>
                </Button>
                <Button asChild variant="ghost">
                  <a href="mailto:legal@eiaawsolutions.com">legal@eiaawsolutions.com</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPLIANCE ROADMAP */}
      <section id="roadmap" className="container mt-24 scroll-mt-20">
        <div className="flex items-start gap-4 mb-8">
          <Activity className="text-primary mt-1 h-5 w-5" />
          <div>
            <span className="eyebrow">06</span>
            <h2 className="mt-1 text-2xl md:text-3xl display">
              Compliance roadmap
              <span className="text-muted-foreground"> — where we&apos;re going.</span>
            </h2>
          </div>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          {[
            ["SOC 2 Type II",      "In audit prep · target Q3 2026",                "in-progress"],
            ["ISO 27001",          "Planned · scoped after SOC 2 attestation",      "planned"],
            ["GDPR Article 28 DPA", "Live — EU SCCs (2021) + UK Addendum",            "live"],
            ["Malaysia PDPA",       "Live — registered as data processor",            "live"],
            ["HIPAA BAA",           "Available on Enterprise · regulated workspaces", "live"],
            ["Independent pen test", "Scheduled Q3 2026 with named CREST vendor",     "in-progress"],
          ].map(([title, detail, status], i) => (
            <div key={title} className={`grid grid-cols-[1fr_2fr_120px] items-center gap-4 px-5 py-3.5 ${i > 0 ? "hairline-t" : ""}`}>
              <span className="text-sm text-foreground">{title}</span>
              <span className="text-xs text-muted-foreground">{detail}</span>
              <span className="justify-self-end">
                <StatusBadge status={status} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT CTA */}
      <section className="container mt-24 mb-8">
        <div className="rounded-lg border border-border p-12 text-center">
          <h2 className="display text-2xl md:text-3xl text-balance max-w-2xl mx-auto">
            Need a custom security review?
            <br />
            <span className="text-muted-foreground">We respond in one business day.</span>
          </h2>
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button asChild variant="secondary" size="lg">
              <Link href="/enterprise">Open intake form</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href="mailto:security@eiaawsolutions.com">security@eiaawsolutions.com</a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return (
      <Badge variant="outline" className="text-2xs">
        <span className="status-dot text-primary" /> Live
      </Badge>
    );
  }
  if (status === "in-progress") {
    return (
      <Badge variant="outline" className="text-2xs text-amber-400 border-amber-400/30">
        <span className="status-dot text-amber-400" /> In progress
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-2xs text-muted-foreground">
      Planned
    </Badge>
  );
}
