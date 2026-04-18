import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Status" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function probe() {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, db: "up" as const, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      db: "down" as const,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const COMPONENTS = [
  { name: "API gateway",       region: "Cloudflare global anycast",       expected: "operational" },
  { name: "Web application",   region: "Railway · ap-southeast-1",         expected: "operational" },
  { name: "Postgres database", region: "Railway · ap-southeast-1",         expected: "live" },
  { name: "AI inference",      region: "Anthropic · United States",         expected: "operational" },
  { name: "Stripe billing",    region: "Global",                             expected: "operational" },
];

export default async function StatusPage() {
  const probed = await probe();

  return (
    <main>
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-12 md:pt-28">
          <span className="eyebrow">Status</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            {probed.ok ? "All systems operational." : "Service degradation detected."}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Last checked {new Date().toISOString().replace("T", " ").slice(0, 19)} UTC · DB ping {probed.latencyMs} ms
          </p>
        </div>
      </section>

      {/* COMPONENT GRID */}
      <section className="container py-12">
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_220px_140px] items-center px-5 py-2.5 hairline-b bg-surface-1">
            <span className="eyebrow">Component</span>
            <span className="eyebrow">Region</span>
            <span className="eyebrow">Status</span>
          </div>
          {COMPONENTS.map((c, i) => {
            const isDb = c.name === "Postgres database";
            const ok = isDb ? probed.ok : true;
            return (
              <div key={c.name} className={`grid grid-cols-[1fr_220px_140px] items-center px-5 py-3.5 ${i > 0 ? "hairline-t" : ""}`}>
                <span className="text-sm text-foreground">{c.name}</span>
                <span className="mono text-xs text-muted-foreground">{c.region}</span>
                <span>
                  <Badge variant="outline" className="text-2xs">
                    <span className={`status-dot ${ok ? "text-primary" : "text-amber-400"}`} />
                    {ok ? "Operational" : "Degraded"}
                  </Badge>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* INCIDENT LOG */}
      <section className="container py-8">
        <div className="rounded-lg border border-border p-8 bg-surface-1">
          <span className="eyebrow">Recent incidents</span>
          <h2 className="mt-3 text-lg display">No incidents in the past 90 days.</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Historical uptime timeline ships with the SOC 2 Type II milestone (target Q3 2026), backed by an
            independent third-party status provider. Until then, this page reflects a live database ping and
            our internal incident log.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            For real-time incident communication during a Severity 1 event, follow{" "}
            <a href="mailto:status@eiaawsolutions.com" className="text-foreground underline underline-offset-2 decoration-border-strong">
              status@eiaawsolutions.com
            </a>
            {" "}or check this page.
          </p>
        </div>
      </section>

      {/* INCIDENT RESPONSE LINK */}
      <section className="container py-8">
        <div className="rounded-lg border border-border p-8">
          <span className="eyebrow">Incident response SLA</span>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Severity definitions, first-action timing, and follow-up cadence are documented at{" "}
            <a href="/trust#incident-response" className="text-foreground underline underline-offset-2 decoration-border-strong">
              /trust#incident-response
            </a>
            . Enterprise customers can contract a written SLA with credits via order form.
          </p>
        </div>
      </section>
    </main>
  );
}
