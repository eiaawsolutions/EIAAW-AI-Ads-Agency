"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Status = "idle" | "submitting" | "ok" | "error";

const KINDS: { value: string; label: string }[] = [
  { value: "DEMO", label: "Architecture demo (30 min)" },
  { value: "SECURITY_REVIEW", label: "Security & compliance review" },
  { value: "DPA", label: "DPA / sub-processor list" },
  { value: "RFP", label: "RFP / procurement intake" },
  { value: "OTHER", label: "Other" },
];

const SPEND_BANDS = ["< $50k / mo", "$50k–$250k / mo", "$250k–$1M / mo", "$1M+ / mo"];

export function EnterpriseIntakeForm({ defaultKind = "DEMO" }: { defaultKind?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    const res = await fetch("/api/enterprise/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!res || !res.ok) {
      const msg = res ? ((await res.json().catch(() => null))?.error ?? "Submission failed") : "Network error";
      setError(msg);
      setStatus("error");
      return;
    }

    setStatus("ok");
    e.currentTarget.reset();
  }

  if (status === "ok") {
    return (
      <div className="rounded-lg border border-border p-8 bg-surface-1">
        <div className="flex items-center gap-2">
          <span className="status-dot text-primary" />
          <span className="eyebrow text-primary">Received</span>
        </div>
        <h3 className="mt-4 display text-xl">We&apos;ll respond within one business day.</h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          A Success Engineer will reach out from <span className="mono text-foreground">enterprise@eiaawsolutions.com</span> with the
          requested materials and a calendar link.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border p-6 lg:p-8 bg-card">
      <div className="grid gap-5">
        <Field label="Request type" name="kind" required>
          <select
            name="kind"
            defaultValue={defaultKind}
            className="w-full bg-surface-1 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-border-strong"
            required
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </Field>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Full name" name="fullName" required>
            <Input name="fullName" required minLength={2} maxLength={120} placeholder="Amos Lee" />
          </Field>
          <Field label="Work email" name="workEmail" required>
            <Input name="workEmail" type="email" required maxLength={254} placeholder="amos@company.com" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Company" name="company" required>
            <Input name="company" required maxLength={120} placeholder="Acme Co" />
          </Field>
          <Field label="Job title" name="jobTitle">
            <Input name="jobTitle" maxLength={120} placeholder="VP Marketing" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Monthly ad spend" name="monthlySpend">
            <select
              name="monthlySpend"
              defaultValue=""
              className="w-full bg-surface-1 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-border-strong"
            >
              <option value="">Select range</option>
              {SPEND_BANDS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Platforms in scope" name="platforms">
            <Input name="platforms" maxLength={200} placeholder="Meta, Google, TikTok" />
          </Field>
        </div>

        <Field label="Anything we should know" name="message">
          <textarea
            name="message"
            rows={4}
            maxLength={2000}
            placeholder="Compliance requirements, current stack, target timeline…"
            className="w-full bg-surface-1 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-border-strong resize-y"
          />
        </Field>

        {error && (
          <div className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <Button type="submit" variant="secondary" disabled={status === "submitting"} className="w-full">
          {status === "submitting" ? "Sending…" : "Send request"}
        </Button>

        <p className="text-2xs text-muted-foreground leading-relaxed">
          By submitting you agree to our processing of these details to respond to your inquiry.
          We don&apos;t share your information. See <a href="/legal/privacy" className="text-foreground hover:underline">Privacy</a>.
        </p>
      </div>
    </form>
  );
}

function Field({ label, name, required, children }: { label: string; name: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={name} className="block">
      <span className="eyebrow block mb-1.5">
        {label}{required ? <span className="text-primary"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-surface-1 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-border-strong"
    />
  );
}
