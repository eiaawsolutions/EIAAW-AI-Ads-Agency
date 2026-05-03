"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Sparkles } from "lucide-react";

const META_MCP_URL = "https://mcp.facebook.com/ads";

/**
 * "Chat with your campaigns from Claude" panel.
 *
 * Surfaces Meta's official Ads MCP server (open beta, launched 2026-04-29)
 * to the operator. The MCP is a Meta-hosted, Meta-OAuthed read-and-write
 * surface that any spec-compliant MCP client (Claude Desktop, Claude.ai,
 * ChatGPT, custom agents) can connect to. Pasting the URL into the
 * operator's own Claude session gives them natural-language access to
 * 29 ads tools — campaign management, insights, industry benchmarks,
 * opportunity scores — alongside our own wizard-driven managed flow.
 *
 * This is pure config + UI: the OAuth + token storage happens entirely
 * on Meta's side when the operator clicks through their Claude connector
 * setup. We never see or hold their MCP token.
 */
export function MetaMcpPanel({ metaConnected }: { metaConnected: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(META_MCP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard blocked — operator can select manually from the field below
    }
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="px-5 py-3 hairline-b flex items-center justify-between">
        <span className="eyebrow flex items-center gap-2">
          <Sparkles className="h-3 w-3" /> Chat with your campaigns from Claude
        </span>
        <span className="mono text-2xs text-muted-foreground">META · OFFICIAL · BETA</span>
      </div>

      <div className="px-5 py-5 space-y-4">
        <p className="text-sm text-foreground/90 leading-relaxed">
          Meta&apos;s official Ads AI Connector lets you talk to your ad accounts in plain English from
          your own Claude session — &ldquo;how&apos;s ROAS this week?&rdquo;, &ldquo;pause campaigns under 1.0×&rdquo;,
          &ldquo;what&apos;s my opportunity score?&rdquo;. It complements the EIAAW wizard, which manages your
          campaigns server-side; the MCP gives you a co-pilot for ad-hoc questions and quick edits.
        </p>

        {!metaConnected && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-800">
            Connect Meta above first. The MCP uses Meta&apos;s OAuth flow and needs an authorized Business
            Manager to scope to.
          </div>
        )}

        <div>
          <label className="eyebrow block mb-1.5">MCP server URL</label>
          <div className="flex items-stretch gap-2">
            <input
              readOnly
              value={META_MCP_URL}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="mono flex-1 h-9 rounded-md border border-border bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={copyUrl}
              className="inline-flex items-center gap-1 text-xs px-3 rounded-md border border-border bg-background hover:bg-muted transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
          </div>
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer text-foreground/90 hover:text-foreground select-none">
            How to connect (3 steps)
          </summary>
          <ol className="mt-3 space-y-2.5 text-muted-foreground list-decimal list-inside pl-1">
            <li>
              <span className="text-foreground">Open your Claude client.</span>
              {" "}In Claude.ai, go to Settings → Connectors → Add Custom Connector. In Claude Desktop,
              edit your MCP config under Settings → Developer.
            </li>
            <li>
              <span className="text-foreground">Paste the URL above</span> as the MCP server endpoint
              and name it <span className="mono">meta-ads</span>.
            </li>
            <li>
              <span className="text-foreground">Authorize on Meta&apos;s consent screen.</span> Claude
              will redirect you to Facebook to grant access to your Business Manager. Pick the same
              business that holds the ad account you connected here. After approval Claude can call
              all 29 Meta Ads tools.
            </li>
          </ol>
          <a
            href="https://www.facebook.com/business/help/1456422242197840"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-primary hover:underline"
          >
            Meta&apos;s setup guide <ExternalLink className="h-3 w-3" />
          </a>
        </details>

        <div className="rounded-md bg-surface-1/60 border border-border px-3 py-2.5 text-2xs text-muted-foreground leading-relaxed">
          <span className="text-foreground/80">Note:</span> the MCP is a read-and-write surface for
          your own Claude session. EIAAW&apos;s server-side wizard remains the system of record for
          campaign creation, image upload, pixel setup, and the full ad pipeline — those flows
          aren&apos;t exposed through the MCP yet.
        </div>
      </div>
    </div>
  );
}
