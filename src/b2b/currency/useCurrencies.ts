"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { currencyKeys, getCurrencies } from "./api";
import { fallbackCurrencies } from "./fallback";
import type { CurrencyInfo } from "./search";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface UseCurrencies {
  items: CurrencyInfo[];
  /** "loading" until the first answer; "error" when the full list could not be loaded (the common ones are still offered). */
  status: "loading" | "ready" | "error";
  refetch: () => void;
}

/** The currency list in the user's language: 160 currencies, popular first, then A to Z. Cached for a day (the API says the same). */
export function useCurrencies(): UseCurrencies {
  const { locale } = useTranslation();
  const q = useQuery({ queryKey: currencyKeys.list(locale), queryFn: () => getCurrencies(locale), staleTime: DAY_MS, gcTime: DAY_MS, retry: 1 });
  const fallback = useMemo(() => fallbackCurrencies(locale), [locale]);
  const items = q.data?.items ?? (q.isError ? fallback : []);
  return { items, status: q.data ? "ready" : q.isError ? "error" : "loading", refetch: () => void q.refetch() };
}
