import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Careers" };

const ROLES = [
  {
    slug: "founding-pilot-engineer",
    title: "Founding Pilot Engineer (full-stack)",
    location: "Kuala Lumpur · hybrid · or fully remote (UTC+5 to UTC+10)",
    type: "Full-time",
    body: "Own end-to-end delivery of one platform connector (Google or LinkedIn next), one cross-functional agent (ads-test or ads-audit), and the durable-execution job runtime that ties them together. You will write the prompts, the integration tests, the monitoring, and the migration scripts. Strong TypeScript + Postgres background required. Anthropic / OpenAI SDK experience a plus.",
    must: ["5+ years TypeScript or similar", "Production Postgres + Prisma or comparable ORM", "Comfort writing prompts as code with versioning + evals", "Has shipped a platform integration end-to-end before"],
    nice: ["Prior paid-media / ad-tech experience", "Has worked with Temporal / Inngest / DBOS", "Open-source contributor in the ai-tools space"],
    open: true,
  },
  {
    slug: "founding-design-engineer",
    title: "Founding Design Engineer",
    location: "Kuala Lumpur · hybrid · or remote in UTC+5 to UTC+10",
    type: "Full-time",
    body: "Own the design system and the surfaces customers actually live in — dashboard, wizard, reports, settings. Linear-tier craft expected. You will work directly with the founder on every product surface and ship daily.",
    must: ["3+ years frontend with React + Tailwind", "Demonstrated taste — share work at level of Linear, Vercel, Stripe", "Comfortable in shadcn/ui and Radix primitives", "Can ship an end-to-end feature without an engineering hand-off"],
    nice: ["Motion/interaction design (Framer Motion, GSAP)", "Data viz background (Recharts, D3)", "Prior agency or growth-team experience"],
    open: true,
  },
];

export default function CareersPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-16 md:pt-28">
          <span className="eyebrow">Careers</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            Small team.
            <br />
            <span className="text-muted-foreground">High craft. Real customers.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            We&apos;re hiring two founding engineers to ship alongside design partners across SEA, ANZ, and
            the US. Open applications welcome — we read every email.
          </p>
        </div>
      </section>

      {/* HOW WE WORK */}
      <section className="container py-16">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-12">
          <div>
            <span className="eyebrow">How we work</span>
            <h2 className="mt-3 text-2xl md:text-3xl display max-w-md">
              Daily ship.
              <br />
              <span className="text-muted-foreground">Customer in the loop.</span>
            </h2>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            <p>
              Async-first across UTC+5 to UTC+10. We meet for ~3 hours overlap daily, ship for the rest. No
              standups. No status meetings. The changelog is the status.
            </p>
            <p>
              You will work directly with paying design partners from week one. Customer pain is the only
              feature backlog that matters. We write our own prompts, our own evals, our own integration
              tests, and our own runbooks.
            </p>
            <p>
              Compensation: competitive base in your local market plus meaningful equity. Health insurance,
              annual learning budget, top-tier hardware. Visa support for relocation to KL if you want it,
              but we don&apos;t require it.
            </p>
          </div>
        </div>
      </section>

      {/* OPEN ROLES */}
      <section className="container py-16">
        <span className="eyebrow">Open roles</span>
        <h2 className="mt-3 text-2xl md:text-3xl display max-w-2xl">
          Two roles open.
          <br />
          <span className="text-muted-foreground">Both founding-team equity.</span>
        </h2>

        <div className="mt-12 space-y-4">
          {ROLES.map((r) => (
            <article key={r.slug} className="rounded-lg border border-border p-6 lg:p-8 bg-card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-medium text-foreground">{r.title}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>{r.location}</span>
                    <span aria-hidden>·</span>
                    <span>{r.type}</span>
                  </div>
                </div>
                {r.open && <Badge variant="outline" className="text-2xs"><span className="status-dot text-primary" /> Open</Badge>}
              </div>

              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{r.body}</p>

              <div className="mt-6 grid md:grid-cols-2 gap-6">
                <div>
                  <span className="eyebrow">Must have</span>
                  <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                    {r.must.map((m) => (
                      <li key={m} className="grid grid-cols-[16px_1fr] gap-2">
                        <span className="text-primary">·</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="eyebrow">Nice to have</span>
                  <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                    {r.nice.map((n) => (
                      <li key={n} className="grid grid-cols-[16px_1fr] gap-2">
                        <span className="text-muted-foreground/60">·</span>
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6">
                <Button asChild variant="secondary" size="sm">
                  <a href={`mailto:careers@eiaawsolutions.com?subject=${encodeURIComponent(`Application — ${r.title}`)}`}>
                    Apply by email
                  </a>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* OPEN APPS */}
      <section className="container hairline-t py-20">
        <div className="rounded-lg border border-border p-8 lg:p-12 bg-surface-1">
          <span className="eyebrow">Open applications</span>
          <h2 className="mt-3 text-xl display max-w-2xl">
            Don&apos;t see your role?
            <br />
            <span className="text-muted-foreground">Tell us what you&apos;d ship.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Email <a href="mailto:careers@eiaawsolutions.com" className="text-foreground underline underline-offset-2 decoration-border-strong">careers@eiaawsolutions.com</a> with
            a short note: what you&apos;d build for us in your first 90 days, links to work you&apos;ve shipped,
            and where you&apos;re located. We respond to every application within five business days.
          </p>
        </div>
      </section>
    </main>
  );
}
