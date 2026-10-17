"use client";

import { useCallback } from "react";
import { useTranslation } from "@/lib/i18n";

/** Replaces `{name}` placeholders. */
export function fmt(text: string, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), text);
}

export type PluralForm = "one" | "few" | "other";
export interface PluralText { one: string; other: string; few?: string }

/** The CLDR plural category for a locale, reduced to the forms we translate (zero/two/many fold into "other"). */
export function pluralForm(locale: string, n: number): PluralForm {
  let c: Intl.LDMLPluralRule = n === 1 ? "one" : "other";
  try { c = new Intl.PluralRules(locale).select(n); } catch { /* unknown locale: English rule */ }
  return c === "one" ? "one" : c === "few" ? "few" : "other";
}

/** `tr(key, "English fallback", { vars })`: the convention checked by b2b/locales.test.ts (every key needs an en entry equal to the fallback). */
export function useTr() {
  const { t, locale } = useTranslation();
  const tr = useCallback((key: string, fallback: string, vars?: Record<string, string | number>) => fmt(t(key, fallback), vars), [t]);
  /** Plural-aware: looks up `<base>.one|few|other` (languages without "few" use "other"); `{n}` is filled automatically. */
  const trn = useCallback((base: string, text: PluralText, n: number, vars: Record<string, string | number> = {}) => {
    const form = pluralForm(locale, n);
    const f: PluralForm = form === "few" && text.few !== undefined ? "few" : form === "one" ? "one" : "other";
    return fmt(t(`${base}.${f}`, text[f] ?? text.other), { n, ...vars });
  }, [t, locale]);
  return { tr, trn, locale };
}
