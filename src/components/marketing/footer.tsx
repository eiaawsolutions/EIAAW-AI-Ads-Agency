import Link from "next/link";
import { LogoWordmark } from "@/components/brand/logo";

const COLS: { title: string; links: [string, string][] }[] = [
  { title: "Platform", links: [["Agents", "/agents"], ["Integrations", "/integrations"], ["Platform", "/platform"], ["Pricing", "/pricing"]] },
  { title: "Company", links: [["About", "/about"], ["Customers", "/customers"], ["Careers", "/careers"], ["Contact", "/contact"]] },
  { title: "Resources", links: [["Docs", "/docs"], ["Changelog", "/changelog"], ["Status", "/status"], ["Trust", "/trust"]] },
  { title: "Legal", links: [["Privacy", "/legal/privacy"], ["Terms", "/legal/terms"], ["DPA", "/trust#dpa"], ["Security", "/trust"]] },
];

export function MarketingFooter() {
  return (
    <footer className="hairline-t mt-32">
      <div className="container grid grid-cols-2 md:grid-cols-6 gap-8 py-16">
        <div className="col-span-2 md:col-span-2">
          <LogoWordmark />
          <p className="mt-4 text-xs text-muted-foreground max-w-xs leading-relaxed">
            AI · Human Partnerships for performance advertising. Predictive, multi-platform, experiment-native.
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="eyebrow mb-3">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="hairline-t">
        <div className="container flex items-center justify-between py-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} EIAAW Solutions</span>
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <span className="mono">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
