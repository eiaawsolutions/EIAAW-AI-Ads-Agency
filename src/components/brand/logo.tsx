import { cn } from "@/lib/utils";

/**
 * Linear-tier mark. Monochrome by default — `currentColor`.
 * Geometric E-glyph replacing the photo-real shield for a technical feel.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path d="M4 4h16v3H7v3h11v3H7v4h13v3H4z" fill="currentColor" />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark className="text-foreground" />
      <span className="text-sm font-medium tracking-tight text-foreground">EIAAW</span>
    </div>
  );
}
