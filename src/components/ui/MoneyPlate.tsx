"use client";

import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Locale-aware currency text; an unknown currency code falls back to "amount CODE" instead of throwing. */
export function formatMoney(amount: number, currency: string | null | undefined, locale: string): string {
  const code = (currency || "").toUpperCase();
  if (!Number.isFinite(amount)) return "";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code || "USD", maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
  } catch {
    return `${amount} ${code}`.trim();
  }
}

interface MoneyPlateProps {
  amount: number;
  currency?: string | null;
  /** Small caption above the amount, e.g. "Fixed budget". */
  label?: string;
  /** Suffix such as "/hr" (pass the translated string). */
  suffix?: string;
  size?: "row" | "lg" | "inline";
  className?: string;
}

/** All prices, budgets and rates use this: brass plate, tabular figures, display font. */
export function MoneyPlate({ amount, currency, label, suffix, size = "row", className }: MoneyPlateProps) {
  const { locale } = useTranslation();
  const text = formatMoney(amount, currency, locale);

  if (size === "inline") {
    return (
      <span className={cn("font-display font-semibold tabular text-money", className)}>
        {text}
        {suffix ? <span className="font-body font-normal">{suffix}</span> : null}
      </span>
    );
  }

  return (
    <div className={cn("inline-flex min-w-[88px] flex-col rounded-control border border-money/25 bg-money-soft px-3 py-2", className)}>
      {label ? <span className="text-micro uppercase text-ink-muted">{label}</span> : null}
      <span className={cn("font-display font-bold tabular text-money", size === "lg" ? "text-[1.75rem] leading-8" : "text-xl leading-6")}>
        {text}
        {suffix ? <span className="ml-0.5 font-body text-label font-normal">{suffix}</span> : null}
      </span>
    </div>
  );
}
