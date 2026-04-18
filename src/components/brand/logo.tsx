import Image from "next/image";
import { cn } from "@/lib/utils";

const SHIELD_SRC = "/brand/EIAAW Solutions logo shield.png";

export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <Image
      src={SHIELD_SRC}
      alt="EIAAW Solutions"
      width={size}
      height={size}
      priority
      className={cn("h-7 w-7 object-contain", className)}
    />
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-foreground leading-none">
        EIAAW
      </span>
    </div>
  );
}

export function LogoLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark size={36} className="h-9 w-9" />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-[0.02em] text-foreground">
          EIAAW SOLUTIONS
        </span>
        <span className="eyebrow mt-0.5 !text-[10px]">AI · Human Partnerships</span>
      </div>
    </div>
  );
}
