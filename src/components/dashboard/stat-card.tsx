import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

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
    <div className={cn("rounded-xl border border-white/5 bg-white/[0.02] p-5", accent && "glow border-brand-500/20")}>
      <div className="mono-tag">{label}</div>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-mono",
              positive ? "text-emerald-400" : "text-red-400",
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
