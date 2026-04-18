import Link from "next/link";
import { LogoWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-40 hairline-b bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center">
            <LogoWordmark />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <Link href="/platform" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
              Platform
            </Link>
            <Link href="/agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
              Agents
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
              Pricing
            </Link>
            <Link href="/enterprise" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
              Enterprise
            </Link>
            <Link href="/trust" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
              Trust
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
              Docs
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/onboarding">
              Start free <span aria-hidden>→</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
