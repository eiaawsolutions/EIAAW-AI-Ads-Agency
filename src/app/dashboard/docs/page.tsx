import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export const metadata = { title: "Docs" };

const SECTIONS = [
  { title: "Quickstart", body: "Connect a platform, run the wizard, launch your first campaign in 15 minutes." },
  { title: "Agents reference", body: "Every agent's input schema, output contract, and cost envelope." },
  { title: "Integrations", body: "How to wire Meta, Google, TikTok, LinkedIn, Microsoft, YouTube, Apple Ads OAuth." },
  { title: "Experiments", body: "Designing A/B tests with statistical rigor, guardrails, and traffic splits." },
  { title: "Security", body: "Tenant isolation, RLS, token encryption, SOC 2 readiness." },
  { title: "API", body: "Programmatic access to campaigns, metrics, and agent runs." },
];

export default function DocsPage() {
  return (
    <>
      <DashboardTopbar title="Docs" subtitle="How EIAAW works, end to end" />
      <main className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <Card key={s.title} className="p-6 hover:border-brand-500/30 transition-colors">
            <h3 className="text-sm font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            <Link href="#" className="mt-4 inline-block text-xs text-brand-300 hover:underline">Read →</Link>
          </Card>
        ))}
      </main>
    </>
  );
}
