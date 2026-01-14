import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variants = {
      default: "bg-primary text-primary-foreground hover:opacity-90 focus:ring-primary",
      outline: "border border-border text-foreground hover:bg-muted focus:ring-primary",
      secondary: "bg-secondary text-secondary-foreground hover:opacity-90 focus:ring-secondary",
    };

    const sizes = {
      default: "px-4 py-2 text-sm",
      sm: "px-3 py-1.5 text-xs",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant as keyof typeof variants],
          sizes[size as keyof typeof sizes],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
