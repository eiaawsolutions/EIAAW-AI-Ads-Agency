import { cn } from "@/lib/utils";

type Tone = "default" | "coral" | "lime" | "amber";

type Props = {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  accent?: boolean;
  tone?: Tone;
};

const TONE_VALUE: Record<Tone, string> = {
  default: "text-foreground",
  coral: "text-coral-500",
  lime: "text-lime-500",
  amber: "text-amber-500",
};

const TONE_GLOW: Record<Tone, string> = {
  default: "",
  coral: "before:bg-coral-500/10",
  lime: "before:bg-lime-500/10",
  amber: "before:bg-amber-500/10",
};

export function StatCard({ label, value, delta, hint, accent, tone = "default" }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-card p-5 transition-colors duration-150 overflow-hidden",
        "before:absolute before:inset-0 before:-z-[1] before:opacity-100 before:transition-opacity before:duration-250",
        "before:pointer-events-none",
        accent && "before:bg-primary/[0.04]",
        !accent && TONE_GLOW[tone],
      )}
    >
      <div className="flex items-center justify-between">
        <div className="eyebrow">{label}</div>
        {accent && <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_0_hsl(var(--primary))]" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={cn("display text-3xl tabular", TONE_VALUE[tone])}>{value}</span>
        {delta !== undefined && (
          <span
            className={cn(
              "mono text-xs tabular",
              positive ? "text-primary" : "text-coral-500",
            )}
          >
            {positive ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {hint && <div className="mt-1.5 text-2xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
