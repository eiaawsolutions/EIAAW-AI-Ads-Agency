"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

type Props = {
  platform: string; // lowercase slug, e.g. "meta"
  displayName: string;
};

/**
 * Confirm + POST + refresh. Destructive, so guarded behind window.confirm
 * with the platform name explicit in the message ("Disconnect Meta?")
 * — accidental clicks shouldn't quietly nuke an OAuth integration.
 */
export function DisconnectButton({ platform, displayName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    if (!window.confirm(`Disconnect ${displayName}? Agents will stop receiving live data from this platform.`)) {
      return;
    }
    setBusy(true);
    const res = await apiFetch<{ ok: boolean; count?: number; error?: string }>(
      `/api/integrations/${platform}/disconnect`,
      { method: "POST" },
    );
    setBusy(false);

    if (!res.ok) {
      // 401/403/429 already surface their own toasts via apiFetch where applicable.
      if (![429, 401].includes(res.status) && res.status < 500) {
        toast.error(res.error);
      }
      return;
    }
    toast.success(`${displayName} disconnected`);
    router.refresh();
  }

  return (
    <Button onClick={disconnect} disabled={busy} size="sm" variant="ghost">
      {busy ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" /> Disconnecting
        </>
      ) : (
        "Disconnect"
      )}
    </Button>
  );
}
