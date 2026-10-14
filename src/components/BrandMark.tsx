import Link from "@/components/LocaleLink";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  /** Kept for compatibility; the wordmark is always "work4u" (design-tokens §5.6). */
  label?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

const SIZE = { sm: "text-xl", md: "text-2xl", lg: "text-3xl" } as const;

/** Plain "work4u" wordmark in the display face. Never "work4u Ledger". */
export function BrandMark({ size = "md", href = "/", className }: BrandMarkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-[44px] shrink-0 items-center font-display font-bold leading-none tracking-tight text-primary transition-colors hover:text-primary-strong",
        SIZE[size],
        className
      )}
    >
      work4u
    </Link>
  );
}
