import Link from "next/link";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Docs" };

const SECTIONS = [
  { n: "01", title: "Quickstart",       body: "Connect a platform, run the wizard, launch your first campaign in 15 minutes." },
  { n: "02", title: "Agents reference", body: "Every agent's input schema, output contract, and cost envelope." },
  { n: "03", title: "Integrations",     body: "How to wire Meta, Google, TikTok, LinkedIn, Microsoft, YouTube, Apple Ads OAuth." },
  { n: "04", title: "Experiments",      body: "Designing A/B tests with statistical rigor, guardrails, and traffic splits." },
  { n: "05", title: "Security",         body: "Tenant isolation, RLS, token encryption, SOC 2 readiness." },
  { n: "06", title: "API",              body: "Programmatic access to campaigns, metrics, and agent runs." },
];

export default function DocsPage() {
  return (
    <>
      <DashboardTopbar title="Docs" subtitle="How EIAAW works, end to end" />
      <main className="p-6">
        <div className="rounded-lg border border-border overflow-hidden">
          {SECTIONS.map((s, i) => (
            <Link
              key={s.n}
              href="#"
              className={`grid grid-cols-[60px_220px_1fr_40px] gap-4 items-center px-5 py-4 hover:bg-surface-1/50 transition-colors duration-150 group ${i > 0 ? "hairline-t" : ""}`}
            >
              <span className="mono text-2xs text-muted-foreground tabular">{s.n}</span>
              <span className="text-sm font-medium text-foreground">{s.title}</span>
              <span className="text-xs text-muted-foreground">{s.body}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors duration-150" />
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
