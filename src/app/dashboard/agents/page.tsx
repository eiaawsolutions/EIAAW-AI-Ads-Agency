import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { registry } from "@/agents/registry";
import { AGENT_CATEGORY } from "@/agents/types";

export const metadata = { title: "Agents" };

export default function AgentsPage() {
  const agents = Object.values(registry);
  return (
    <>
      <DashboardTopbar title="Agents" subtitle={`${agents.length} agents registered`} />
      <main className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <Card key={a.kind} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-brand-300">{a.kind.toLowerCase().replace("_", "-")}</span>
                <Badge variant="outline">{AGENT_CATEGORY[a.kind]}</Badge>
              </div>
              <h3 className="text-sm font-semibold">{a.name}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{a.description}</p>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
