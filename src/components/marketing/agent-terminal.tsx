"use client";

import { useEffect, useRef, useState } from "react";

type LogLine = {
  t: string;           // timestamp
  agent: string;
  level: "info" | "ok" | "warn";
  msg: string;
};

const SCRIPT: Omit<LogLine, "t">[] = [
  { agent: "ads-dna",        level: "info", msg: "extracting brand DNA — aurora.com" },
  { agent: "ads-dna",        level: "ok",   msg: "positioning · clinical-grade · sensitive-skin" },
  { agent: "ads-plan",       level: "info", msg: "building 12-week media plan · $48k/mo" },
  { agent: "ads-plan",       level: "ok",   msg: "allocation META 45% · GOOG 35% · TIKTOK 20%" },
  { agent: "ads-competitor", level: "info", msg: "scanning meta ad library · 4 competitors" },
  { agent: "ads-competitor", level: "ok",   msg: "whitespace · UGC with creator voiceover" },
  { agent: "ads-math",       level: "info", msg: "forecasting 3 scenarios · cpc=$1.20" },
  { agent: "ads-math",       level: "ok",   msg: "moderate · roas 3.5x · cpa $22" },
  { agent: "ads-generate",   level: "info", msg: "generating 8 creatives · 4 aspect ratios" },
  { agent: "ads-meta",       level: "ok",   msg: "launched · cmp_meta_8fk2n7 · $500/day" },
  { agent: "ads-google",     level: "ok",   msg: "launched · cmp_goog_1p3zq9 · $500/day" },
  { agent: "ads-tiktok",     level: "ok",   msg: "launched · cmp_ttok_4h9x2c · $200/day" },
  { agent: "ads-audit",      level: "info", msg: "monitoring · 250 checks · every 15 min" },
  { agent: "ads-test",       level: "info", msg: "exp_17 · headline split · 50/50" },
  { agent: "ads-creative",   level: "warn", msg: "cr_221 frequency 2.4 · queue replacement" },
  { agent: "ads-budget",     level: "ok",   msg: "reallocated $340/day · tiktok → meta" },
  { agent: "ads-test",       level: "ok",   msg: "exp_17 sig p=0.04 · winner variant B" },
];

function now() {
  const d = new Date();
  return d.toLocaleTimeString("en-US", { hour12: false });
}

export function AgentTerminal() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const idxRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const next = SCRIPT[idxRef.current % SCRIPT.length];
      idxRef.current += 1;
      setLines((prev) => {
        const nextLines = [...prev, { ...next, t: now() }];
        return nextLines.length > 14 ? nextLines.slice(-14) : nextLines;
      });
    };
    tick();
    const id = setInterval(tick, 1400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-1">
      {/* Terminal chrome */}
      <div className="flex items-center justify-between hairline-b px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          </div>
          <span className="mono text-xs text-muted-foreground">eiaaw · agent activity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="live-dot" />
          <span className="mono text-2xs text-muted-foreground">LIVE</span>
        </div>
      </div>

      {/* Log stream */}
      <div className="mono text-xs px-4 py-3 h-[340px] overflow-y-auto scrollbar-thin">
        {lines.map((l, i) => (
          <div key={i} className="fade-in grid grid-cols-[70px_130px_30px_1fr] gap-3 py-[3px] leading-relaxed">
            <span className="text-muted-foreground/60 tabular">{l.t}</span>
            <span className="text-foreground/70">{l.agent}</span>
            <span
              className={
                l.level === "ok"
                  ? "text-primary"
                  : l.level === "warn"
                    ? "text-amber-400"
                    : "text-muted-foreground/80"
              }
            >
              {l.level === "ok" ? "✓" : l.level === "warn" ? "!" : "·"}
            </span>
            <span className="text-foreground/90 truncate">{l.msg}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
