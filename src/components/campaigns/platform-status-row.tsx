import Link from "next/link";
import { CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { PlatformChip } from "@/components/platform/chip";

export type PlatformLaunchState = "live" | "draft" | "requires_action" | "failed";

export type PlatformStatusRowProps = {
  platform: string;
  state: PlatformLaunchState;
  externalCampaignId?: string | null;
  reason: string;
  remediation?: { label: string; href: string } | null;
  adapterMode?: "live" | "stub";
  /** Optional action area (e.g., retry button) rendered top-right. */
  actions?: React.ReactNode;
};

const PRESET: Record<
  PlatformLaunchState,
  { icon: typeof CheckCircle2; label: string; tone: string; bg: string }
> = {
  live: {
    icon: CheckCircle2,
    label: "Live on platform",
    tone: "text-primary",
    bg: "bg-primary/5 border-primary/20",
  },
  draft: {
    icon: Clock,
    label: "Saved as draft",
    tone: "text-muted-foreground",
    bg: "bg-surface-1 border-border",
  },
  requires_action: {
    icon: AlertCircle,
    label: "Action required",
    tone: "text-amber-600",
    bg: "bg-amber-400/10 border-amber-400/30",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    tone: "text-coral-600",
    bg: "bg-coral-500/10 border-coral-500/30",
  },
};

export function PlatformStatusRow({
  platform,
  state,
  externalCampaignId,
  reason,
  remediation,
  adapterMode,
  actions,
}: PlatformStatusRowProps) {
  const preset = PRESET[state];
  const Icon = preset.icon;
  return (
    <div className={`rounded-md border ${preset.bg} px-4 py-3.5`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${preset.tone}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <PlatformChip platform={platform.toLowerCase()} />
            <span className={`text-xs mono uppercase tracking-wide ${preset.tone}`}>
              {preset.label}
            </span>
            {adapterMode === "stub" && (
              <span className="text-2xs mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
                sandbox
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-foreground/80 leading-relaxed">{reason}</p>
          {externalCampaignId && (
            <p className="mt-1 text-2xs mono text-muted-foreground">
              External id · {externalCampaignId}
            </p>
          )}
          {remediation && (
            <Link
              href={remediation.href}
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {remediation.label} →
            </Link>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
