"use client";
import { Bell, Search, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardTopbar({ title, subtitle, crumbs }: { title: string; subtitle?: string; crumbs?: string[] }) {
  return (
    <header className="h-14 hairline-b bg-background/90 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-2 min-w-0">
        {crumbs && crumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-sm">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                <span className={i === crumbs.length - 1 ? "text-foreground" : "text-muted-foreground"}>{c}</span>
              </span>
            ))}
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-foreground font-medium">{title}</span>
          </nav>
        ) : (
          <>
            <h1 className="text-sm font-medium text-foreground">{title}</h1>
            {subtitle && <span className="text-xs text-muted-foreground hidden md:inline">· {subtitle}</span>}
          </>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="relative hidden md:block">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search…"
            className="h-8 w-64 rounded-md border border-border bg-background pl-8 pr-2 text-sm placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          <span className="mono text-2xs text-muted-foreground/50 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            ⌘K
          </span>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <Bell className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="secondary">
          <Plus className="h-3.5 w-3.5" /> New
        </Button>
      </div>
    </header>
  );
}
