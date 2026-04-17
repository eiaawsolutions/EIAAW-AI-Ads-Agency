import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Settings" };

const MODES = [
  { v: "AUTONOMOUS", d: "No human gates. Best for scaled accounts." },
  { v: "ASSISTED",   d: "Human approves launch and major budget shifts." },
  { v: "ENTERPRISE", d: "Custom guardrails + audit sign-off." },
];

export default function SettingsPage() {
  return (
    <>
      <DashboardTopbar title="Settings" subtitle="Organization · billing · execution mode" />
      <main className="p-6 space-y-6 max-w-2xl">
        {/* Organization */}
        <section className="rounded-lg border border-border overflow-hidden">
          <div className="px-5 py-3 hairline-b">
            <span className="eyebrow">Organization</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input defaultValue="Demo Brand Co." />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input defaultValue="demo" />
            </div>
            <Button variant="secondary" size="sm" className="mt-2">Save</Button>
          </div>
        </section>

        {/* Execution mode */}
        <section className="rounded-lg border border-border overflow-hidden">
          <div className="px-5 py-3 hairline-b">
            <span className="eyebrow">Execution mode</span>
          </div>
          <div className="p-5 space-y-2">
            {MODES.map((m, i) => (
              <button
                key={m.v}
                className={`grid grid-cols-[140px_1fr] gap-4 items-start w-full text-left px-4 py-3 rounded-md border transition-colors duration-150 ${
                  i === 1 ? "border-primary/60 bg-primary/5" : "border-border hover:border-border-strong"
                }`}
              >
                <span className="mono text-xs text-foreground">{m.v}</span>
                <span className="text-xs text-muted-foreground">{m.d}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Subscription */}
        <section className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 hairline-b">
            <span className="eyebrow">Subscription</span>
            <Badge variant="live">Active</Badge>
          </div>
          <div className="p-5">
            <div className="flex items-baseline gap-2">
              <span className="display text-2xl text-foreground">Growth</span>
              <span className="mono text-xs text-muted-foreground">$1,499/mo</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Renews 2026-05-17</p>
            <Button variant="subtle" size="sm" className="mt-4">Manage in Stripe</Button>
          </div>
        </section>
      </main>
    </>
  );
}
