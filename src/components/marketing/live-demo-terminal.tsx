"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "gate" | "running" | "done" | "error";

type LogLine = {
  t: string;
  level: "info" | "ok" | "warn" | "err";
  agent: string;
  msg: string;
};

type DnaOutput = {
  positioning?: string;
  valueProps?: string[];
  personas?: { name: string; age?: string; channels?: string[]; pains?: string[] }[];
  toneOfVoice?: { pillars?: string[]; banned?: string[] };
  colorPalette?: { primary?: string; secondary?: string; accent?: string };
  typography?: { display?: string; body?: string };
  imageryStyle?: string;
  markets?: string[];
};

type ApiResponse =
  | { ok: true; brand: { name: string; domain: string }; output: DnaOutput; model: string; stubbed: boolean }
  | { ok: false; error: string; capped?: boolean };

function nowStr() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export function LiveDemoTerminal() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<LogLine[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  function pushLine(l: Omit<LogLine, "t">) {
    setLines((prev) => [...prev, { ...l, t: nowStr() }].slice(-16));
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  function startProgressLog() {
    setLines([]);
    const steps: Omit<LogLine, "t">[] = [
      { agent: "ads-dna", level: "info", msg: "fetching brand context…" },
      { agent: "ads-dna", level: "info", msg: "extracting positioning + audience…" },
      { agent: "ads-dna", level: "info", msg: "scoring tone-of-voice pillars…" },
      { agent: "ads-dna", level: "info", msg: "synthesising visual palette…" },
      { agent: "ads-dna", level: "info", msg: "compiling persona segments…" },
    ];
    let i = 0;
    pushLine(steps[i++]);
    tickRef.current = setInterval(() => {
      if (i < steps.length) pushLine(steps[i++]);
    }, 1200);
  }

  function stopProgressLog() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    let normalisedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalisedUrl)) normalisedUrl = `https://${normalisedUrl}`;

    try {
      new URL(normalisedUrl);
    } catch {
      setError("Enter a valid URL (e.g. acme.com).");
      return;
    }

    setPhase("running");
    startProgressLog();

    const res = await fetch("/api/demo/dna", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalisedUrl, workEmail: email.trim() }),
    }).catch(() => null);

    stopProgressLog();

    if (!res) {
      pushLine({ agent: "ads-dna", level: "err", msg: "network error" });
      setError("Network error. Try again.");
      setPhase("error");
      return;
    }

    const json = (await res.json().catch(() => null)) as ApiResponse | null;
    if (!json || !json.ok) {
      const msg = json?.error ?? `Failed (HTTP ${res.status})`;
      pushLine({ agent: "ads-dna", level: "err", msg });
      setError(msg);
      setPhase("error");
      return;
    }

    pushLine({ agent: "ads-dna", level: "ok", msg: `done · ${json.brand.name}` });
    if (json.stubbed) pushLine({ agent: "ads-dna", level: "warn", msg: "stub mode — connect API key for real run" });

    const o = json.output;
    if (o.positioning) pushLine({ agent: "positioning", level: "ok", msg: o.positioning.slice(0, 80) });
    if (o.valueProps?.[0]) pushLine({ agent: "value-props", level: "ok", msg: o.valueProps.slice(0, 3).join(" · ") });
    if (o.personas?.[0]) {
      const p = o.personas[0];
      pushLine({ agent: "persona", level: "ok", msg: `${p.name} · ${p.age ?? "—"} · ${(p.channels ?? []).join(", ")}` });
    }
    if (o.toneOfVoice?.pillars) pushLine({ agent: "tone", level: "ok", msg: o.toneOfVoice.pillars.slice(0, 4).join(" · ") });
    if (o.colorPalette?.primary) {
      pushLine({
        agent: "palette",
        level: "ok",
        msg: `${o.colorPalette.primary} · ${o.colorPalette.secondary ?? ""} · ${o.colorPalette.accent ?? ""}`,
      });
    }
    if (o.markets?.length) pushLine({ agent: "markets", level: "ok", msg: o.markets.join(", ") });

    setPhase("done");
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-1 shadow-[0_20px_60px_-20px_hsl(174_62%_40%_/_0.18)]">
      {/* chrome */}
      <div className="flex items-center justify-between hairline-b px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          </div>
          <span className="mono text-xs text-muted-foreground">eiaaw · live ads-dna</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="live-dot" />
          <span className="mono text-2xs text-muted-foreground">
            {phase === "running" ? "RUNNING" : phase === "done" ? "DONE" : phase === "error" ? "ERROR" : "READY"}
          </span>
        </div>
      </div>

      {/* form */}
      {(phase === "idle" || phase === "error") && (
        <form onSubmit={onSubmit} className="px-4 py-4 space-y-3 hairline-b">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Run our brand-DNA agent on your site. Real Claude call. Returns positioning, audience, palette, and tone in ~10s.
          </p>
          <div className="grid gap-2">
            <label className="block">
              <span className="eyebrow block mb-1">Your site</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="acme.com"
                className="mono w-full bg-surface-1 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-border-strong"
              />
            </label>
            <label className="block">
              <span className="eyebrow block mb-1">Work email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="mono w-full bg-surface-1 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-border-strong"
              />
            </label>
          </div>
          {error && <div className="text-2xs text-amber-400">{error}</div>}
          <button
            type="submit"
            className="w-full rounded-md bg-primary/15 border border-primary/30 px-3 py-2 text-xs text-primary hover:bg-primary/20 transition-colors mono uppercase tracking-wider"
          >
            Run ads-dna
          </button>
          <p className="text-2xs text-muted-foreground">
            One run per email per hour. We&apos;ll add you to our pilot list — no ongoing email.
          </p>
        </form>
      )}

      {/* log */}
      {(phase === "running" || phase === "done") && (
        <div className="mono text-xs px-4 py-3 h-[340px] overflow-y-auto scrollbar-thin">
          {lines.map((l, i) => (
            <div key={i} className="fade-in grid grid-cols-[70px_120px_24px_1fr] gap-3 py-[3px] leading-relaxed">
              <span className="text-muted-foreground/60 tabular">{l.t}</span>
              <span className="text-foreground/80">{l.agent}</span>
              <span
                className={
                  l.level === "ok"
                    ? "text-primary"
                    : l.level === "warn"
                      ? "text-amber-400"
                      : l.level === "err"
                        ? "text-red-400"
                        : "text-muted-foreground/80"
                }
              >
                {l.level === "ok" ? "✓" : l.level === "warn" ? "!" : l.level === "err" ? "✗" : "·"}
              </span>
              <span className="text-foreground/90 truncate">{l.msg}</span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {phase === "done" && (
        <div className="hairline-t px-4 py-3 flex items-center justify-between">
          <span className="text-2xs text-muted-foreground">
            That&apos;s 1 of 19 agents. Want the full 19-agent run on your account?
          </span>
          <a
            href="/enterprise"
            className="text-2xs text-primary mono uppercase tracking-wider hover:underline"
          >
            Talk to sales →
          </a>
        </div>
      )}
    </div>
  );
}
