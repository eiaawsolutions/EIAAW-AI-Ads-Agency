"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

type Result =
  | { enqueued: true; jobId: string; correlationId: string; perPlatform: number }
  | { enqueued: false; reason: string; lastJobId?: string };

export function RunAuditButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function trigger() {
    setBusy(true);
    try {
      const res = await fetch("/api/audits/trigger", { method: "POST" });
      const data = (await res.json()) as Result | { error: string };
      if ("error" in data) throw new Error(data.error);
      if (!data.enqueued) {
        toast.message("Audit already queued", { description: data.reason });
        return;
      }
      toast.success("Audit queued", {
        description: `${data.perPlatform} platform${data.perPlatform === 1 ? "" : "s"} scheduled. Refreshing in a moment…`,
      });
      // Light poll: refresh the server component a few times so findings appear
      // when the worker drains the queue.
      let attempts = 0;
      const id = setInterval(() => {
        attempts += 1;
        router.refresh();
        if (attempts >= 8) clearInterval(id);
      }, 5_000);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={trigger} disabled={busy}>
      <Sparkles className="h-3.5 w-3.5" /> {busy ? "Queuing…" : "Run audit"}
    </Button>
  );
}
