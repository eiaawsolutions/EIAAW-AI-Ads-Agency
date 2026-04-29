"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Mode = "AUTONOMOUS" | "ASSISTED" | "ENTERPRISE";

const MODES: { v: Mode; d: string }[] = [
  { v: "AUTONOMOUS", d: "No human gates. Best for scaled accounts." },
  { v: "ASSISTED", d: "Human approves launch and major budget shifts." },
  { v: "ENTERPRISE", d: "Custom guardrails + audit sign-off." },
];

export function OrgSettingsForm({
  initialName,
  initialSlug,
  initialMode,
  canEdit,
}: {
  initialName: string;
  initialSlug: string;
  initialMode: Mode;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [saving, setSaving] = useState(false);

  async function save(payload: Partial<{ name: string; slug: string; executionMode: Mode }>) {
    setSaving(true);
    try {
      const res = await fetch("/api/org/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success("Saved");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="px-5 py-3 hairline-b">
          <span className="eyebrow">Organization</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit || saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={!canEdit || saving}
            />
            <p className="text-2xs text-muted-foreground">Lowercase letters, numbers, dashes. Used in URLs.</p>
          </div>
          {canEdit && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              disabled={saving || (name === initialName && slug === initialSlug)}
              onClick={() => save({ name, slug })}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          )}
          {!canEdit && (
            <p className="text-2xs text-muted-foreground">
              Only owners and admins can edit organization details.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="px-5 py-3 hairline-b">
          <span className="eyebrow">Execution mode</span>
        </div>
        <div className="p-5 space-y-2">
          {MODES.map((m) => {
            const active = m.v === mode;
            return (
              <button
                key={m.v}
                type="button"
                disabled={!canEdit || saving}
                onClick={() => {
                  setMode(m.v);
                  if (canEdit) save({ executionMode: m.v });
                }}
                className={`grid grid-cols-[140px_1fr] gap-4 items-start w-full text-left px-4 py-3 rounded-md border transition-colors duration-150 ${
                  active ? "border-primary/60 bg-primary/5" : "border-border hover:border-border-strong"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="mono text-xs text-foreground">{m.v}</span>
                <span className="text-xs text-muted-foreground">{m.d}</span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
