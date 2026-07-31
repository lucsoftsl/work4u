import Link from "next/link";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  label?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

const BADGE_SIZE = {
  sm: "h-9 w-9 rounded-xl",
  md: "h-11 w-11 rounded-2xl",
  lg: "h-12 w-12 rounded-2xl",
};

const ICON_SIZE = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const WORDMARK_SIZE = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
};

export function BrandMark({ label = "Work4U", subtitle, size = "md", href = "/", className }: BrandMarkProps) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-3 font-black tracking-tight text-[#10324a] transition-opacity hover:opacity-80", className)}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center bg-[#1e6d8a] text-white shadow-[0_10px_24px_rgba(30,109,138,0.22)]",
          BADGE_SIZE[size]
        )}
      >
        <Shield className={ICON_SIZE[size]} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn("leading-none", WORDMARK_SIZE[size])}>{label}</span>
        {subtitle && (
          <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.24em] text-[#5c728d]">
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
