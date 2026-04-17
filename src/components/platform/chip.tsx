import { cn } from "@/lib/utils";
import { PLATFORM_META, type PlatformKey } from "@/lib/platforms";

/**
 * Platform chip — dot + label, brand-colored via CSS var.
 * Usage: <PlatformChip platform="meta" /> or <PlatformChip platform="META" />
 */
export function PlatformChip({
  platform,
  showLabel = true,
  className,
}: {
  platform: string;
  showLabel?: boolean;
  className?: string;
}) {
  const k = platform.toLowerCase() as PlatformKey;
  const meta = PLATFORM_META[k];
  if (!meta) return <span className={className}>{platform}</span>;

  return (
    <span className={cn(meta.className, "pf-chip", className)}>
      <span className="pf-dot h-1.5 w-1.5" />
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}

/** Compact dot-only variant. */
export function PlatformDot({ platform, className }: { platform: string; className?: string }) {
  const k = platform.toLowerCase() as PlatformKey;
  const meta = PLATFORM_META[k];
  if (!meta) return null;
  return <span className={cn(meta.className, "pf-dot", className)} />;
}
