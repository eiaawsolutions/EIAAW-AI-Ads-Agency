import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Brain, Layers, Radio, ShieldCheck, Workflow, Zap } from "lucide-react";

export const metadata = { title: "Platform" };

const MODULES = [
  { icon: Brain, t: "Agent Runtime", d: "Typed contracts, deterministic dispatch, persistent audit trail. Every run has tokens-in, tokens-out, cost, and output stored." },
  { icon: Workflow, t: "Flow Engine", d: "Compose agents into pipelines. Autonomous / Assisted / Enterprise modes control human gates and escalation." },
  { icon: Layers, t: "Shared Memory", d: "Brand DNA, historical metrics, and experiment outcomes form a closed-loop memory each agent can query." },
  { icon: Radio, t: "Platform Adapters", d: "Unified interface over Meta, Google, TikTok, LinkedIn, Microsoft, YouTube, Apple. One launch call, seven surfaces." },
  { icon: Zap, t: "Real-time Signals", d: "Pixel + CAPI + server-side conversions dedupe at ingest. Anomalies page operators under 60s." },
  { icon: ShieldCheck, t: "Tenant Isolation", d: "Org-scoped rows + Postgres RLS. No cross-tenant reads, ever. SOC 2 Type II readiness built in." },
];

export default function PlatformPage() {
  return (
    <main className="container py-24">
      <Badge>Platform</Badge>
      <h1 className="mt-4 text-5xl md:text-6xl font-semibold tracking-tight text-balance max-w-3xl">
        A runtime for an <span className="text-gradient">AI ad organization.</span>
      </h1>
      <p className="mt-4 text-muted-foreground max-w-2xl">
        Six core systems, nineteen agents, seven platforms. Designed for pentest-readiness,
        deterministic audits, and closed-loop learning from day one.
      </p>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => (
          <Card key={m.t} className="p-6">
            <m.icon className="h-5 w-5 text-brand-400" />
            <h3 className="mt-6 text-base font-semibold">{m.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{m.d}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
