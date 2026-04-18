import Link from "next/link";
import { Calendar, Shield, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnterpriseIntakeForm } from "@/components/marketing/enterprise-intake-form";

const PROOF_POINTS = [
  { n: "01", t: "Multi-tenant isolation at the DB layer", d: "Postgres RLS with SET LOCAL app.current_org_id per request. Cross-tenant leakage tests run in CI." },
  { n: "02", t: "Encrypted at rest, encrypted in transit", d: "AES-256-GCM envelope encryption for OAuth tokens with per-env keys. TLS 1.3 termination at the edge." },
  { n: "03", t: "Audit trail per agent run",            d: "AgentRun rows store input, output, model, tokens-in, tokens-out, cost, and prompt version. Exportable to your SIEM." },
  { n: "04", t: "Cost guardrails by tenant tier",        d: "Daily AI-cost cap per organization. Hard 402 response when exceeded. Per-platform rate limits as defense-in-depth." },
  { n: "05", t: "Bring your own ad accounts",            d: "OAuth-based — your credentials, your data, your ad accounts. We never hold your spend wallet." },
  { n: "06", t: "SSO + SCIM on Enterprise tier",         d: "Google OIDC out of the box. SAML 2.0 + SCIM 2.0 provisioning available. JIT user provisioning supported." },
];

const PROCUREMENT = [
  ["Sub-processor list",      "/trust#sub-processors"],
  ["Security overview",       "/trust"],
  ["DPA template",            "/trust#dpa"],
  ["Incident response SLA",   "/trust#incident-response"],
  ["Encryption details",      "/trust#encryption"],
  ["Privacy policy",          "/legal/privacy"],
];

const calUrl = process.env.NEXT_PUBLIC_ENTERPRISE_CAL_URL ?? "mailto:enterprise@eiaawsolutions.com?subject=EIAAW%20enterprise%20call";

export const metadata = { title: "Enterprise" };

export default function EnterprisePage() {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-16 md:pt-28">
          <span className="eyebrow">Enterprise</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            Built for procurement.
            <br />
            <span className="text-muted-foreground">Operated by your team.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Multi-tenant isolation at the database layer, encrypted token vault, full audit trail, SSO + SCIM, and a Success Engineer
            who knows your account by name. We start with a 30-minute architecture call.
          </p>
          <div className="mt-8 flex items-center gap-2">
            <Button asChild variant="secondary" size="lg">
              <Link href={calUrl} target={calUrl.startsWith("http") ? "_blank" : undefined}>
                <Calendar /> Book architecture call
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/trust">View trust center</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* TWO-COL: proof + intake form */}
      <section className="container py-20">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16">
          {/* LEFT — proof points */}
          <div>
            <span className="eyebrow">What we ship</span>
            <h2 className="mt-3 text-2xl md:text-3xl display max-w-md">
              Six things every CISO wants to see
              <br />
              <span className="text-muted-foreground">before they sign.</span>
            </h2>

            <div className="mt-8 rounded-lg border border-border overflow-hidden">
              {PROOF_POINTS.map((p, i) => (
                <div key={p.n} className={`px-5 py-4 ${i > 0 ? "hairline-t" : ""}`}>
                  <div className="flex items-start gap-3">
                    <span className="mono text-2xs text-muted-foreground tabular mt-1">{p.n}</span>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{p.t}</h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{p.d}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <span className="eyebrow">Procurement-ready</span>
              <div className="mt-3 rounded-lg border border-border overflow-hidden">
                {PROCUREMENT.map(([label, href], i) => (
                  <Link
                    key={label}
                    href={href}
                    className={`flex items-center justify-between px-5 py-3 text-sm hover:bg-surface-1/60 transition-colors ${i > 0 ? "hairline-t" : ""}`}
                  >
                    <span className="text-foreground">{label}</span>
                    <span className="text-muted-foreground" aria-hidden>→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — intake form (sticky on lg) */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <span className="eyebrow">Tell us what you need</span>
            <h2 className="mt-3 text-2xl md:text-3xl display max-w-md">
              We&apos;ll respond in
              <br />
              <span className="text-muted-foreground">one business day.</span>
            </h2>
            <div className="mt-8">
              <EnterpriseIntakeForm />
            </div>
          </div>
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      <section className="hairline-t">
        <div className="container py-20">
          <span className="eyebrow">What happens next</span>
          <h2 className="mt-3 text-2xl md:text-3xl display max-w-2xl">
            A linear, no-pressure sequence.
            <br />
            <span className="text-muted-foreground">No spam, no SDR cadence.</span>
          </h2>

          <div className="mt-10 rounded-lg border border-border overflow-hidden">
            {[
              ["01", <Calendar key="cal" className="h-4 w-4" />, "30-min architecture call",   "We map your current stack, ad spend posture, and compliance requirements. You'll meet the Success Engineer who would own your account."],
              ["02", <Shield   key="sec" className="h-4 w-4" />, "Security questionnaire",     "Our pre-filled CAIQ-Lite + your custom items. We turn it around in 3 business days."],
              ["03", <FileText key="dpa" className="h-4 w-4" />, "DPA + sub-processor list",   "Standard DPA based on EU SCCs. Sub-processor list with each provider's SOC 2 / ISO 27001 status."],
              ["04", <Users    key="usr" className="h-4 w-4" />, "Pilot with one workspace",   "30-day paid pilot on one brand. Real data, real campaigns. Success criteria defined upfront."],
            ].map(([n, icon, title, desc], i) => (
              <div key={String(n)} className={`grid grid-cols-[60px_40px_1fr] items-start gap-4 px-5 py-5 ${i > 0 ? "hairline-t" : ""}`}>
                <span className="mono text-2xs text-muted-foreground tabular pt-0.5">{n}</span>
                <span className="text-muted-foreground pt-0.5">{icon}</span>
                <div>
                  <h3 className="text-sm font-medium text-foreground">{title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-2xl">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hairline-t">
        <div className="container py-24 text-center">
          <h2 className="display text-3xl md:text-4xl text-balance max-w-2xl mx-auto">
            Get the materials your security team
            <br />
            <span className="text-muted-foreground">would otherwise ask for.</span>
          </h2>
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button asChild variant="secondary" size="lg">
              <Link href={calUrl} target={calUrl.startsWith("http") ? "_blank" : undefined}>
                <Calendar /> Book architecture call
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/trust">View trust center</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
