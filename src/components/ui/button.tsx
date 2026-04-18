import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary — solid teal, used sparingly
        default: "bg-primary text-primary-foreground hover:bg-brand-600 rounded-md",
        // Secondary — default CTA. Warm-dark solid against cream
        secondary:
          "bg-foreground text-background hover:bg-foreground/90 rounded-md",
        // Subtle — surface with border
        subtle:
          "bg-surface-1 text-foreground border border-border hover:bg-surface-2 hover:border-border-strong rounded-md",
        // Ghost — transparent, text-only
        ghost: "text-foreground hover:bg-surface-1 rounded-md",
        // Outline — just border
        outline:
          "border border-border text-foreground hover:border-border-strong hover:bg-surface-1 rounded-md",
        // Destructive
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md",
        // Link
        link: "text-foreground hover:text-muted-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3 text-sm",
        sm: "h-7 px-2.5 text-xs",
        lg: "h-10 px-4 text-sm",
        xl: "h-12 px-6 text-base",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
