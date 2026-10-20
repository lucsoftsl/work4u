import { b2b } from "@/b2b/api/client";
import type { CurrencyInfo } from "./search";

// CONTRACT FOR DAN: company currency (b2b/impl-log-backend.md). No default currency exists: a company has one only after it is chosen.

export interface CurrencyList { items: CurrencyInfo[]; popular: string[]; fallbackCurrency: string }
export interface CurrencyPreferences { preferredCurrency: string | null; defaultCurrency: string }

export const currencyKeys = {
  list: (lang: string) => ["b2b", "currencies", lang] as const,
  preferences: ["b2b", "preferences"] as const,
};

export const getCurrencies = (lang: string) => b2b<CurrencyList>("/currencies", { query: { lang } });
/** Works before any company exists (the sign-up wizard). */
export const getPreferences = () => b2b<CurrencyPreferences>("/me/preferences");
/** `null` forgets the remembered currency. */
export const patchPreferences = (preferredCurrency: string | null) => b2b<CurrencyPreferences>("/me/preferences", { method: "PATCH", json: { preferredCurrency } });
