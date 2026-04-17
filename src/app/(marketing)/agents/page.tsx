import { registry } from "@/agents/registry";
import { AGENT_CATEGORY } from "@/agents/types";

const CATEGORY_LABEL = {
  strategy: "Strategy",
  platform: "Platform",
  cross: "Cross-functional",
  creative: "Creative",
};

const CATEGORY_ORDER: (keyof typeof CATEGORY_LABEL)[] = ["strategy", "platform", "cross", "creative"];

export const metadata = { title: "Agents" };

export default function AgentsPage() {
  const byCategory = Object.values(registry).reduce((acc, agent) => {
    const cat = AGENT_CATEGORY[agent.kind];
    (acc[cat] ??= []).push(agent);
    return acc;
  }, {} as Record<string, typeof registry[keyof typeof registry][]>);

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="container relative pt-20 pb-16 md:pt-28">
          <span className="eyebrow">Agents</span>
          <h1 className="mt-4 display text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl">
            Nineteen agents with
            <br />
            <span className="text-muted-foreground">one responsibility each.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Every agent has a stable contract — input schema, output schema, cost envelope, and audit trail.
            They compose into flows. Flows run autonomously, assisted, or under enterprise guardrails.
          </p>
        </div>
      </section>

      <section className="container space-y-24 pb-24">
        {CATEGORY_ORDER.map((cat) => (
          <div key={cat} className="grid lg:grid-cols-[1fr_3fr] gap-12">
            <div>
              <span className="eyebrow">{CATEGORY_LABEL[cat]}</span>
              <p className="mt-2 mono text-xs text-muted-foreground">{byCategory[cat]?.length ?? 0} agents</p>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              {byCategory[cat]?.map((a, i) => (
                <div
                  key={a.kind}
                  className={`grid grid-cols-[220px_1fr] gap-6 px-5 py-4 hover:bg-surface-1/50 transition-colors duration-150 ${i > 0 ? "hairline-t" : ""}`}
                >
                  <div>
                    <span className="mono text-sm text-foreground">
                      {a.kind.toLowerCase().replace("_", "-")}
                    </span>
                    <div className="mt-0.5 text-xs text-muted-foreground">{a.name}</div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
