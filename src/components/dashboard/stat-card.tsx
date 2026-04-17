import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  accent?: boolean;
};

export function StatCard({ label, value, delta, hint, accent }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 transition-colors duration-150",
        accent && "bg-surface-1",
      )}
    >
      <div className="eyebrow">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="display text-3xl tabular text-foreground">{value}</span>
        {delta !== undefined && (
          <span
            className={cn(
              "mono text-xs tabular",
              positive ? "text-primary" : "text-red-400",
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
