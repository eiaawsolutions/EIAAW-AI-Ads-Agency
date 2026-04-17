"use client";
import { Bell, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="h-16 border-b border-white/5 bg-background/60 backdrop-blur-xl flex items-center justify-between px-8">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search campaigns, agents, experiments…"
            className="h-9 w-80 rounded-md border border-white/10 bg-white/[0.02] pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
          />
        </div>
        <Button size="icon" variant="ghost"><Bell className="h-4 w-4" /></Button>
        <Button size="sm" variant="gradient"><Plus /> New campaign</Button>
      </div>
    </header>
  );
}
