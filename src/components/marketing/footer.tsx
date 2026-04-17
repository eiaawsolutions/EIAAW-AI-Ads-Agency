import Link from "next/link";
import { LogoWordmark } from "@/components/brand/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 mt-24">
      <div className="container py-16 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2">
          <LogoWordmark />
          <p className="mt-4 text-sm text-muted-foreground max-w-sm">
            A multi-agent AI organization for performance advertising. Predictive, multi-platform, experiment-native.
          </p>
        </div>
        {[
          { title: "Platform", links: [["Agents", "/agents"], ["Integrations", "/integrations"], ["Pricing", "/pricing"], ["Changelog", "/changelog"]] },
          { title: "Company", links: [["About", "/about"], ["Customers", "/customers"], ["Careers", "/careers"], ["Contact", "/contact"]] },
          { title: "Legal", links: [["Privacy", "/legal/privacy"], ["Terms", "/legal/terms"], ["DPA", "/legal/dpa"], ["Security", "/legal/security"]] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="mono-tag mb-4">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="container py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} EIAAW Solutions. All rights reserved.</span>
          <span className="font-mono">build · {new Date().toISOString().slice(0, 10)}</span>
        </div>
      </div>
    </footer>
  );
}
