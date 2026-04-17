import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={cn("h-8 w-auto", className)} aria-hidden>
      <defs>
        <linearGradient id="shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5DDECA" />
          <stop offset="0.55" stopColor="#14B39B" />
          <stop offset="1" stopColor="#083C3C" />
        </linearGradient>
        <linearGradient id="figure" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E6FBF8" />
          <stop offset="1" stopColor="#8FEBDD" />
        </linearGradient>
      </defs>
      <path
        d="M24 2 L44 9 V28 C44 42 34 51 24 54 C14 51 4 42 4 28 V9 Z"
        fill="url(#shield)"
        stroke="#2FCBB3"
        strokeWidth="0.6"
        strokeOpacity="0.4"
      />
      <circle cx="24" cy="17" r="3.2" fill="url(#figure)" />
      <path
        d="M24 21 C20 24 19 30 21 36 L20 46 M24 21 C28 24 29 30 27 36 L28 46"
        stroke="url(#figure)"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <g stroke="url(#figure)" strokeWidth="1.2" strokeLinecap="round" opacity="0.9">
        <path d="M30 28 L36 26" />
        <path d="M30 32 L37 32" />
        <path d="M30 36 L36 38" />
        <circle cx="37" cy="26" r="1" fill="#E6FBF8" />
        <circle cx="38" cy="32" r="1" fill="#E6FBF8" />
        <circle cx="37" cy="38" r="1" fill="#E6FBF8" />
      </g>
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-[0.18em] text-foreground">EIAAW</span>
        <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-brand-300/80">
          AI · Human Partnerships
        </span>
      </div>
    </div>
  );
}
