"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, Beaker, BookOpen, Cog, FileText, Gauge, Home, Layers, PlugZap, Radio, Rocket, Sparkles, Wallet } from "lucide-react";
import { LogoWordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { section: "Overview", items: [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/dashboard/performance", icon: BarChart3, label: "Performance" },
    { href: "/dashboard/live", icon: Activity, label: "Live monitor" },
  ]},
  { section: "Operations", items: [
    { href: "/dashboard/campaigns", icon: Rocket, label: "Campaigns" },
    { href: "/dashboard/experiments", icon: Beaker, label: "Experiments" },
    { href: "/dashboard/budget", icon: Wallet, label: "Budget" },
    { href: "/dashboard/creatives", icon: Sparkles, label: "Creatives" },
  ]},
  { section: "Intelligence", items: [
    { href: "/dashboard/agents", icon: Layers, label: "Agents" },
    { href: "/dashboard/reports", icon: FileText, label: "Reports" },
    { href: "/dashboard/audit", icon: Gauge, label: "Audit" },
  ]},
  { section: "Config", items: [
    { href: "/dashboard/integrations", icon: PlugZap, label: "Integrations" },
    { href: "/dashboard/settings", icon: Cog, label: "Settings" },
    { href: "/dashboard/docs", icon: BookOpen, label: "Docs" },
  ]},
];

export function DashboardSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 border-r border-white/5 bg-background/40 min-h-screen flex flex-col">
      <div className="p-5 border-b border-white/5">
        <Link href="/"><LogoWordmark /></Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-7">
        {NAV.map((section) => (
          <div key={section.section}>
            <div className="mono-tag px-2 mb-2">{section.section}</div>
            <ul className="space-y-0.5">
              {section.items.map((it) => {
                const active = pathname === it.href;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                        active
                          ? "bg-brand-500/10 text-foreground border border-brand-500/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent",
                      )}
                    >
                      <it.icon className="h-4 w-4" />
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-white/5">
        <div className="glass rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span className="text-muted-foreground">Autonomous mode</span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-brand-300">19 agents · 7 platforms</div>
        </div>
      </div>
    </aside>
  );
}
