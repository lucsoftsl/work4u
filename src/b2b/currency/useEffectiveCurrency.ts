"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrgOptional } from "@/b2b/context/OrgContext";
import { qk } from "@/b2b/api/endpoints";
import { currencyKeys, getPreferences, patchPreferences, type CurrencyPreferences } from "./api";
import { effectiveCurrency } from "./effective";

const PREFS_STALE_MS = 5 * 60_000;

export interface EffectiveCurrency {
  /** What every currency selector pre-selects: the company's, else the user's remembered, else EUR. Never null. */
  currency: string;
  companyCurrency: string | null;
  /** The company has chosen its currency: amounts are in it and selectors become read-only text. */
  isSet: boolean;
  preferred: string | null;
  /** The first answer from the API has not arrived yet (the value is EUR until then). */
  loading: boolean;
  /** Save a pick as the user's default for every other selector (PATCH /me/preferences). A failed save is silent: the pick still works. */
  remember: (code: string) => void;
  /** After the company currency was set (first money write, profile save): re-read the company, its settings and every amount. */
  refreshCompany: () => void;
}

/** The one place the default-currency rule lives. Works inside a company and, without one, in the sign-up wizard. */
export function useEffectiveCurrency(): EffectiveCurrency {
  const org = useOrgOptional();
  const qc = useQueryClient();
  const prefs = useQuery({ queryKey: currencyKeys.preferences, queryFn: getPreferences, staleTime: PREFS_STALE_MS, retry: 0 });

  const orgMe = org?.me?.org;
  const companyCurrency = orgMe?.currencyIsSet && orgMe.currency ? orgMe.currency : null;
  const preferred = prefs.data?.preferredCurrency ?? org?.me?.preferredCurrency ?? null;
  const currency = effectiveCurrency({ company: companyCurrency, preferred, api: orgMe?.effectiveCurrency ?? prefs.data?.defaultCurrency });
  const loading = org ? !org.me && prefs.isPending : prefs.isPending;

  const orgId = org?.orgId;
  const remember = useCallback((code: string) => {
    const known = qc.getQueryData<CurrencyPreferences>(currencyKeys.preferences)?.preferredCurrency ?? null;
    if (known === code) return;
    // Show it at once; the answer from the server replaces it.
    qc.setQueryData<CurrencyPreferences>(currencyKeys.preferences, { preferredCurrency: code, defaultCurrency: code });
    patchPreferences(code).then((saved) => qc.setQueryData(currencyKeys.preferences, saved)).catch(() => undefined);
  }, [qc]);

  const refreshCompany = useCallback(() => {
    if (orgId) void qc.invalidateQueries({ queryKey: qk.org(orgId) });
  }, [qc, orgId]);

  return { currency, companyCurrency, isSet: companyCurrency !== null, preferred, loading, remember, refreshCompany };
}
