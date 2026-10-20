"use client";

import { useTranslation } from "@/lib/i18n";
import { CurrencySelect } from "./CurrencySelect";
import { currencyLabel } from "./search";
import { useCurrencies } from "./useCurrencies";

interface Props {
  /** The company has chosen its currency: show it as text (the profile changes it). */
  isSet: boolean;
  /** The company's currency when `isSet`, else the currency picked now. */
  currency: string;
  onPick: (code: string) => void;
  id?: string;
  error?: string | null;
  className?: string;
}

/**
 * Next to an amount: a selector while the company has no currency (the first amount chooses it), plain text once it has one.
 * The short hint says what the selector does so nobody sets the company currency by accident.
 */
export function CurrencyChoice({ isSet, currency, onPick, id, error, className }: Props) {
  const { t } = useTranslation();
  const { items } = useCurrencies();
  if (isSet) {
    const known = items.find((c) => c.code === currency);
    return (
      <p className={className ?? "text-sm text-ops-ink"}>
        <span className="font-bold">{t("b2b.currency.companyLabel", "Currency")}: </span>
        <span>{known ? currencyLabel(known) : currency}</span>
      </p>
    );
  }
  return (
    <CurrencySelect
      id={id} className={className} label={t("b2b.currency.chooseLabel", "Company currency")} value={currency} onChange={onPick} error={error}
      hint={t("b2b.currency.chooseHint", "Not chosen yet. Saving the first amount sets this as the company currency for all prices.")}
    />
  );
}
