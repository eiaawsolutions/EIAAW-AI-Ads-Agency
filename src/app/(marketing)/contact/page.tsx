import Link from "next/link";
import { Mail, Building2, Shield, Briefcase, MessageSquare, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Contact" };

const ROUTES = [
  {
    icon: Building2,
    eyebrow: "Sales & enterprise",
    title: "30-min architecture call",
    body: "Procurement materials, security pack, DPA, pilot scoping. We respond in one business day.",
    primary: { label: "Open intake form", href: "/enterprise" },
    secondary: { label: "enterprise@eiaawsolutions.com", href: "mailto:enterprise@eiaawsolutions.com" },
  },
  {
    icon: MessageSquare,
    eyebrow: "Product & support",
    title: "Customer support",
    body: "Bug reports, usage questions, integration troubleshooting. Logged-in users — open the support panel in the dashboard for fastest response.",
    primary: { label: "Open dashboard", href: "/dashboard" },
    secondary: { label: "support@eiaawsolutions.com", href: "mailto:support@eiaawsolutions.com" },
  },
  {
    icon: Shield,
    eyebrow: "Security",
    title: "Vulnerability disclosure",
    body: "Found something? Email our security inbox. Triage within 2 business days. Responsible disclosure appreciated.",
    primary: { label: "security@eiaawsolutions.com", href: "mailto:security@eiaawsolutions.com" },
    secondary: { label: "Security posture", href: "/trust" },
  },
  {
    icon: Scale,
    eyebrow: "Legal",
    title: "Contracts & DPA",
    body: "DPA review, MSA negotiation, redlines. We standard-DPA most accounts and redline only on material differences.",
    primary: { label: "legal@eiaawsolutions.com", href: "mailto:legal@eiaawsolutions.com" },
    secondary: { label: "Read the DPA", href: "/trust#dpa" },
  },
  {
    icon: Briefcase,
    eyebrow: "Careers",
    title: "Hiring",
    body: "Two founding engineering roles open. Open applications welcome. We respond to every application.",
    primary: { label: "See open roles", href: "/careers" },
    secondary: { label: "careers@eiaawsolutions.com", href: "mailto:careers@eiaawsolutions.com" },
  },
  {
    icon: Mail,
    eyebrow: "Press & partnerships",
    title: "Media & partner inquiries",
    body: "Quotes, briefings, integration partnerships. We have a press kit available on request.",
    primary: { label: "press@eiaawsolutions.com", href: "mailto:press@eiaawsolutions.com" },
    secondary: { label: "About the company", href: "/about" },
  },
];

export default function ContactPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-16 md:pt-28">
          <span className="eyebrow">Contact</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            One inbox per intent.
            <br />
            <span className="text-muted-foreground">No SDR cadence.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Pick the right channel — we route directly to the human who handles it. Real responses within
            one business day for sales, two for security, five for open applications.
          </p>
        </div>
      </section>

      {/* ROUTING GRID */}
      <section className="container py-16">
        <div className="grid md:grid-cols-2 gap-6">
          {ROUTES.map((r) => {
            const Icon = r.icon;
            return (
              <article key={r.title} className="rounded-lg border border-border p-6 lg:p-8 bg-card">
                <div className="flex items-start gap-3">
                  <span className="rounded-md bg-surface-1 border border-border p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <span className="eyebrow">{r.eyebrow}</span>
                    <h2 className="mt-1 text-base font-medium text-foreground">{r.title}</h2>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                <div className="mt-6 flex items-center gap-2 flex-wrap">
                  <Button asChild variant="secondary" size="sm">
                    {r.primary.href.startsWith("mailto:") ? (
                      <a href={r.primary.href}>{r.primary.label}</a>
                    ) : (
                      <Link href={r.primary.href}>{r.primary.label}</Link>
                    )}
                  </Button>
                  {r.secondary && (
                    r.secondary.href.startsWith("mailto:") ? (
                      <a href={r.secondary.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {r.secondary.label}
                      </a>
                    ) : (
                      <Link href={r.secondary.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {r.secondary.label}
                      </Link>
                    )
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* COMPANY FACTS */}
      <section className="container hairline-t py-16">
        <div className="rounded-lg border border-border overflow-hidden">
          {[
            ["Entity",         "EIAAW Solutions"],
            ["Headquarters",   "Kuala Lumpur, Malaysia"],
            ["Primary region", "ap-southeast-1 (Singapore)"],
            ["Status page",    "All systems operational — see /status"],
          ].map(([k, v], i) => (
            <div key={k} className={`grid grid-cols-[180px_1fr] px-5 py-3.5 ${i > 0 ? "hairline-t" : ""}`}>
              <span className="eyebrow">{k}</span>
              <span className="text-sm text-foreground">{v}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
