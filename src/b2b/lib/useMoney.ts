"use client";

import { useCallback, useState } from "react";
import { useOrg } from "@/b2b/context/OrgContext";
import { useEffectiveCurrency } from "@/b2b/currency/useEffectiveCurrency";
import { useTr } from "@/b2b/setup/i18n";
import { formatMoney } from "./money";

/**
 * Money for the current viewer. `finance` is false without finance.view: then no money UI exists at all (the API leaves the keys out).
 * A company has no currency until one is chosen (there is no default): while it has none, the forms show a currency selector next to the
 * amount, pre-selected with the effective currency (company, else the user's remembered, else EUR), and send the pick with the first
 * write. Once chosen, `isSet` is true and the currency is plain read-only text.
 */
export function useMoney() {
  const { can } = useOrg();
  const { locale } = useTr();
  const finance = can("finance.view");
  const eff = useEffectiveCurrency();
  // Until the user picks, the selector follows the effective currency (it may still be loading).
  const [picked, setPickedState] = useState<string | null>(null);
  const selected = picked ?? eff.currency;
  /** The currency amounts are typed and shown in: the company's, or the one picked while the company has none. */
  const currency = eff.companyCurrency ?? selected;
  /** Sent with the first amount; null once the company has its currency. */
  const chooseCurrency = eff.isSet ? null : selected;
  const pick = useCallback((code: string) => { setPickedState(code); eff.remember(code); }, [eff]);
  const format = useCallback((minor: number) => formatMoney(minor, currency, locale), [currency, locale]);
  return { finance, currency, isSet: eff.isSet, companyCurrency: eff.companyCurrency, selected, chooseCurrency, pick, loadingCurrency: eff.loading, refreshCompany: eff.refreshCompany, locale, format };
}
