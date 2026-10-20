"use client";

import { useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import { fmt, plural, type PluralText } from "@/b2b/lib/plural";

export { fmt, pluralForm, type PluralForm, type PluralText } from "@/b2b/lib/plural";

/** `tr(key, "English fallback", { vars })`: the convention checked by b2b/locales.test.ts (every key needs an en entry equal to the fallback). */
export function useTr() {
  const { t, locale } = useTranslation();
  const tr = useCallback((key: string, fallback: string, vars?: Record<string, string | number>) => fmt(t(key, fallback), vars), [t]);
  /** Plural-aware: looks up `<base>.one|few|other` by the language's plural rule; `{n}` is filled automatically. */
  const trn = useCallback((base: string, text: PluralText, n: number, vars: Record<string, string | number> = {}) => plural(t, locale, base, text, n, vars), [t, locale]);
  return { tr, trn, locale };
}
