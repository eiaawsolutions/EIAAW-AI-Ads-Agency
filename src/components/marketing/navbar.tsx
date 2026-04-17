import Link from "next/link";
import { LogoWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <LogoWordmark />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/platform" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Platform</Link>
          <Link href="/agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Agents</Link>
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button asChild size="sm" variant="gradient">
            <Link href="/onboarding">Start free trial</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
