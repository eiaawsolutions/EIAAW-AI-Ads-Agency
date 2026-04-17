import { DashboardTopbar } from "@/components/dashboard/topbar";
import { registry } from "@/agents/registry";
import { AGENT_CATEGORY } from "@/agents/types";

export const metadata = { title: "Agents" };

const CATEGORY_LABEL = { strategy: "Strategy", platform: "Platform", cross: "Cross-functional", creative: "Creative" };
const CATEGORY_ORDER: (keyof typeof CATEGORY_LABEL)[] = ["strategy", "platform", "cross", "creative"];

export default function AgentsPage() {
  const agents = Object.values(registry);
  const byCat = agents.reduce((acc, a) => {
    const c = AGENT_CATEGORY[a.kind];
    (acc[c] ??= []).push(a);
    return acc;
  }, {} as Record<string, typeof agents>);

  return (
    <>
      <DashboardTopbar title="Agents" subtitle={`${agents.length} agents registered`} />
      <main className="p-6 space-y-6">
        {CATEGORY_ORDER.map((cat) => (
          <div key={cat} className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 hairline-b">
              <span className="eyebrow">{CATEGORY_LABEL[cat]}</span>
              <span className="mono text-xs text-muted-foreground tabular">{byCat[cat]?.length ?? 0}</span>
            </div>
            {byCat[cat]?.map((a, i) => (
              <div
                key={a.kind}
                className={`grid grid-cols-[200px_1fr_100px] gap-4 items-center px-5 py-3 hover:bg-surface-1/50 transition-colors duration-150 ${i > 0 ? "hairline-t" : ""}`}
              >
                <div>
                  <div className="mono text-sm text-foreground">{a.kind.toLowerCase().replace("_", "-")}</div>
                  <div className="text-2xs text-muted-foreground mt-0.5">{a.name}</div>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">{a.description}</div>
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="status-dot text-primary" />
                  <span className="text-xs text-muted-foreground">ready</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </main>
    </>
  );
}
