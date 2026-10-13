import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "default" | "outline";
type Size = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** "default" and "outline" are the previous names for primary and secondary. */
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  /** Shows a spinner, sets aria-busy and blocks clicks; the label stays. */
  loading?: boolean;
}

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-control font-bold transition-colors duration-fast ease-out " +
  "disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45 active:translate-y-px";

const VARIANTS: Record<Exclude<Variant, "default" | "outline">, string> = {
  primary: "bg-primary text-on-fill hover:bg-primary-strong active:bg-primary-strong",
  secondary: "border border-ink/80 bg-surface text-ink hover:bg-sunken active:bg-sunken",
  ghost: "bg-transparent text-primary hover:bg-primary-soft active:bg-primary-soft",
  destructive: "bg-danger text-on-fill hover:bg-danger/90 active:bg-danger/80",
};

const SIZES: Record<Size, string> = {
  default: "min-h-[44px] px-4 py-2 text-label",
  sm: "min-h-[44px] px-3 py-2 text-label",
  lg: "min-h-[52px] px-5 py-3 text-body",
  icon: "h-11 w-11 shrink-0",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "default", className?: string): string {
  const resolved = variant === "default" ? "primary" : variant === "outline" ? "secondary" : variant;
  return cn(BASE, VARIANTS[resolved], SIZES[size], className);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const classes = buttonClasses(variant, size, className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, { className: cn(classes, child.props.className) });
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
