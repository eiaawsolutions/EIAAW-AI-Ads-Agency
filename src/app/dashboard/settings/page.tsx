import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <DashboardTopbar title="Settings" subtitle="Organization · billing · execution mode" />
      <main className="p-8 space-y-6 max-w-3xl">
        <Card className="p-6">
          <h3 className="text-sm font-semibold">Organization</h3>
          <div className="mt-5 space-y-4">
            <div className="space-y-1.5"><Label>Name</Label><Input defaultValue="Demo Brand Co." /></div>
            <div className="space-y-1.5"><Label>Slug</Label><Input defaultValue="demo" /></div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold">Execution mode</h3>
          <p className="mt-1 text-xs text-muted-foreground">Controls how much human oversight each agent run requires.</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { v: "AUTONOMOUS", d: "No human gates. Best for scaled accounts." },
              { v: "ASSISTED", d: "Human approves launch and major budget shifts." },
              { v: "ENTERPRISE", d: "Custom guardrails + audit sign-off." },
            ].map((m, i) => (
              <button key={m.v} className={`text-left rounded-lg border p-4 transition-colors ${i === 1 ? "border-brand-500 bg-brand-500/10" : "border-white/10"}`}>
                <div className="font-mono text-xs text-brand-300">{m.v}</div>
                <div className="mt-2 text-xs text-muted-foreground">{m.d}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Subscription</h3>
              <p className="mt-1 text-xs text-muted-foreground">Growth · $1,499/mo · renews 2026-05-17</p>
            </div>
            <Badge variant="live">Active</Badge>
          </div>
          <Button variant="secondary" className="mt-5">Manage in Stripe</Button>
        </Card>
      </main>
    </>
  );
}
