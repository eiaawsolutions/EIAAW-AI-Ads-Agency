import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { allPlatforms } from "@/integrations/registry";

export const metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <>
      <DashboardTopbar title="Integrations" subtitle="Connect ad accounts, analytics, and CRMs" />
      <main className="p-8 space-y-6">
        <div>
          <h2 className="text-sm font-semibold mb-4">Ad platforms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allPlatforms.map((p) => (
              <Card key={p} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p}</span>
                  <Badge variant="outline">Not connected</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">OAuth flow stubbed. Wire real credentials via <code className="font-mono text-brand-300">.env</code>.</p>
                <Button size="sm" variant="secondary" className="mt-4 w-full">Connect {p}</Button>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-4">Analytics & CRM</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["Google Analytics 4", "HubSpot", "Salesforce"].map((t) => (
              <Card key={t} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{t}</span>
                  <Badge variant="outline">Not connected</Badge>
                </div>
                <Button size="sm" variant="secondary" className="mt-4 w-full">Connect {t}</Button>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
