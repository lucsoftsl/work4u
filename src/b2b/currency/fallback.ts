import type { CurrencyInfo } from "./search";

/** The first-time default of every currency selector, used only when neither the company nor the user has chosen (and the API did not say). */
export const FIRST_TIME_CURRENCY = "EUR";

/** The most common currencies, the same order the API lists first. Used to keep the selector usable when the full list cannot be loaded. */
export const POPULAR_CURRENCIES = ["EUR", "USD", "GBP", "RON", "PLN", "HUF", "CZK", "BGN", "CHF", "SEK", "DKK", "NOK"] as const;

/** Names and symbols from the browser's own tables (Intl). Not the 160-currency list: only what the offline/error state offers. */
export function fallbackCurrencies(lang: string): CurrencyInfo[] {
  let names: Intl.DisplayNames | null = null;
  try { names = new Intl.DisplayNames([lang], { type: "currency" }); } catch { /* unknown language: codes only */ }
  return POPULAR_CURRENCIES.map((code) => {
    let symbol: string = code;
    let minorUnits = 2;
    try {
      const f = new Intl.NumberFormat(lang, { style: "currency", currency: code, currencyDisplay: "narrowSymbol" });
      symbol = f.formatToParts(0).find((p) => p.type === "currency")?.value ?? code;
      minorUnits = f.resolvedOptions().maximumFractionDigits ?? 2;
    } catch { /* keep the code */ }
    return { code, name: names?.of(code) ?? code, symbol, minorUnits, popular: true };
  });
}
