import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { allPlatforms } from "@/integrations/registry";

export const metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <>
      <DashboardTopbar title="Integrations" subtitle="Connect ad accounts, analytics, and CRMs" />
      <main className="p-6 space-y-6">
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-5 py-3 hairline-b">
            <span className="eyebrow">Ad platforms</span>
          </div>
          {allPlatforms.map((p, i) => (
            <div key={p} className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 ${i > 0 ? "hairline-t" : ""}`}>
              <div>
                <div className="text-sm font-medium text-foreground">{p}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">OAuth flow stubbed · wire real creds via .env</div>
              </div>
              <Badge variant="outline">Not connected</Badge>
              <Button size="sm" variant="subtle">Connect</Button>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-5 py-3 hairline-b">
            <span className="eyebrow">Analytics & CRM</span>
          </div>
          {["Google Analytics 4", "HubSpot", "Salesforce"].map((t, i) => (
            <div key={t} className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 ${i > 0 ? "hairline-t" : ""}`}>
              <span className="text-sm font-medium text-foreground">{t}</span>
              <Badge variant="outline">Not connected</Badge>
              <Button size="sm" variant="subtle">Connect</Button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
