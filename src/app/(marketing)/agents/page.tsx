import { registry } from "@/agents/registry";
import { AGENT_CATEGORY } from "@/agents/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const CATEGORY_LABEL = {
  strategy: "Strategy & Planning",
  platform: "Platform Execution",
  cross: "Cross-functional",
  creative: "Creative Production",
};

export const metadata = { title: "Agents" };

export default function AgentsPage() {
  const byCategory = Object.values(registry).reduce((acc, agent) => {
    const cat = AGENT_CATEGORY[agent.kind];
    (acc[cat] ??= []).push(agent);
    return acc;
  }, {} as Record<string, typeof registry[keyof typeof registry][]>);

  return (
    <main className="container py-24">
      <Badge>Agents</Badge>
      <h1 className="mt-4 text-5xl md:text-6xl font-semibold tracking-tight text-balance max-w-3xl">
        Nineteen agents with <span className="text-gradient">one responsibility each.</span>
      </h1>
      <p className="mt-4 text-muted-foreground max-w-2xl">
        Every agent has a stable contract (input → output), an audit trail, and a cost budget. They
        compose into flows. Flows run autonomously, assisted, or under enterprise guardrails.
      </p>

      <div className="mt-16 space-y-16">
        {(["strategy", "platform", "cross", "creative"] as const).map((cat) => (
          <section key={cat}>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">{CATEGORY_LABEL[cat]}</h2>
              <span className="mono-tag">{byCategory[cat]?.length ?? 0} agents</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {byCategory[cat]?.map((a) => (
                <Card key={a.kind} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs text-brand-300">
                      {a.kind.toLowerCase().replace("_", "-")}
                    </span>
                    <Badge variant="outline">{cat}</Badge>
                  </div>
                  <h3 className="text-base font-semibold">{a.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.description}</p>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
