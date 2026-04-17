import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-2xs font-medium uppercase",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-1 text-muted-foreground",
        solid: "border-transparent bg-primary/15 text-primary",
        live: "border-primary/30 bg-primary/10 text-primary",
        warn: "border-amber-500/30 bg-amber-500/10 text-amber-400",
        danger: "border-red-500/30 bg-red-500/10 text-red-400",
        outline: "border-border-strong bg-transparent text-muted-foreground",
        ghost: "border-transparent bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
