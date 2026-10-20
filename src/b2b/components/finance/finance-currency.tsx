"use client";

import { createContext, useCallback, useContext } from "react";
import { formatAmount } from "@/b2b/lib/money";
import { useTr } from "@/b2b/setup/i18n";

/** The currency of the amounts on the Finance screen (from the API response), so every table cell uses its digits. */
const FinanceCurrency = createContext<string | null>(null);
export const FinanceCurrencyProvider = FinanceCurrency.Provider;
export const useFinanceCurrency = (): string | null => useContext(FinanceCurrency);

/** `amount(minor)`: the number in the user's language with the digits of the Finance currency (JPY none, EUR two, KWD three). */
export function useAmountFormat(): (minor: number) => string {
  const { locale } = useTr();
  const currency = useFinanceCurrency();
  return useCallback((minor: number) => formatAmount(minor, locale, currency), [locale, currency]);
}
