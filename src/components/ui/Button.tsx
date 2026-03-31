import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-2xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

    const variants = {
      default: "bg-brand text-white shadow-[0_14px_32px_rgba(30,109,138,0.2)] hover:bg-brand/90 focus:ring-primary",
      outline: "border border-outline bg-white text-ink hover:bg-[#f4f8fb] focus:ring-primary",
      secondary: "bg-[#e6f1f5] text-[#18566e] hover:bg-[#d9eaf0] focus:ring-secondary",
      ghost: "bg-transparent text-ink hover:bg-white/70 focus:ring-primary",
    };

    const sizes = {
      default: "px-4 py-2.5 text-sm",
      sm: "px-3 py-2 text-xs",
      lg: "px-6 py-3.5 text-base",
      icon: "h-10 w-10",
    };

    const classes = cn(
      baseStyles,
      variants[variant as keyof typeof variants],
      sizes[size as keyof typeof sizes],
      className
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: cn(classes, child.props.className),
      });
    }

    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
