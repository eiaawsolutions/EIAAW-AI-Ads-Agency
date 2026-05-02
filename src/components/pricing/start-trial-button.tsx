"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * "Start trial" CTA on the pricing page. Collects email inline (no extra
 * page-load), POSTs to /api/stripe/checkout, redirects to Stripe Checkout.
 *
 * Mirrors SMT's signup pattern — email + plan are the minimum surface to
 * get a trial running. The rest (workspace name, brand, etc.) is captured
 * after sign-in via the dashboard onboarding step.
 */
export function StartTrialButton({
  plan,
  variant = "subtle",
}: {
  plan: "STARTER" | "GROWTH";
  variant?: "subtle" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, email: email.trim().toLowerCase() }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        toast.error(json.error ?? `Checkout failed (${res.status})`);
        return;
      }
      // Redirect to Stripe Checkout. window.location for a hard nav.
      window.location.href = json.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  const baseClass =
    variant === "secondary"
      ? "mt-8 w-full inline-flex items-center justify-center rounded-md bg-foreground text-background h-10 px-4 text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      : "mt-8 w-full inline-flex items-center justify-center rounded-md border border-border bg-background text-foreground h-10 px-4 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={baseClass}>
        Start 14-day trial
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-2">
      <input
        type="email"
        required
        autoFocus
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        className="w-full h-10 px-3 text-sm rounded-md border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
      />
      <button type="submit" disabled={loading || !email} className={baseClass.replace("mt-8 ", "")}>
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Opening Stripe…
          </>
        ) : (
          `Continue to checkout`
        )}
      </button>
      <p className="text-2xs text-muted-foreground text-center pt-1">
        Card required. Cancel anytime in the 14-day trial — no charge.
      </p>
    </form>
  );
}
