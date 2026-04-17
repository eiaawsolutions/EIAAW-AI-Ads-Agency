"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Beaker,
  BookOpen,
  Cog,
  FileText,
  Gauge,
  Home,
  Layers,
  PlugZap,
  Rocket,
  Sparkles,
  Wallet,
} from "lucide-react";
import { LogoWordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV: { section: string; items: { href: string; icon: typeof Home; label: string; shortcut?: string }[] }[] = [
  {
    section: "Overview",
    items: [
      { href: "/dashboard",             icon: Home,       label: "Home",           shortcut: "H" },
      { href: "/dashboard/performance", icon: BarChart3,  label: "Performance",    shortcut: "P" },
      { href: "/dashboard/live",        icon: Activity,   label: "Live monitor",   shortcut: "L" },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/dashboard/campaigns",   icon: Rocket,     label: "Campaigns" },
      { href: "/dashboard/experiments", icon: Beaker,     label: "Experiments" },
      { href: "/dashboard/budget",      icon: Wallet,     label: "Budget" },
      { href: "/dashboard/creatives",   icon: Sparkles,   label: "Creatives" },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { href: "/dashboard/agents",      icon: Layers,     label: "Agents" },
      { href: "/dashboard/reports",     icon: FileText,   label: "Reports" },
      { href: "/dashboard/audit",       icon: Gauge,      label: "Audit" },
    ],
  },
  {
    section: "Config",
    items: [
      { href: "/dashboard/integrations", icon: PlugZap,   label: "Integrations" },
      { href: "/dashboard/settings",    icon: Cog,        label: "Settings" },
      { href: "/dashboard/docs",        icon: BookOpen,   label: "Docs" },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 hairline-r min-h-screen flex flex-col bg-background">
      <div className="h-14 flex items-center px-5 hairline-b">
        <Link href="/">
          <LogoWordmark />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-5 space-y-6">
        {NAV.map((section) => (
          <div key={section.section}>
            <div className="eyebrow px-3 mb-1.5">{section.section}</div>
            <ul className="space-y-0.5">
              {section.items.map((it) => {
                const active = pathname === it.href;
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={cn(
                        "group flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors duration-150",
                        active
                          ? "bg-surface-1 text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-1/60",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1">{it.label}</span>
                      {it.shortcut && (
                        <span className="mono text-2xs text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          {it.shortcut}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="hairline-t p-3">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-surface-1">
          <span className="live-dot" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">Autonomous</div>
            <div className="mono text-2xs text-muted-foreground tabular">19 · 7</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
