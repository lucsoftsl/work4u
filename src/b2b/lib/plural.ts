// Plural forms for the B2B UI, usable from components, hooks and plain functions alike. The LANGUAGE decides the form (CLDR):
// en/es/fr/hu: one | other. ro: one (1), few (0 and 2-19), other (20+, with "de": "25 de lucrări"). The English text is only the fallback
// when a dictionary has no entry, so a caller never has to pass a `few` text for Romanian to get its `few` form.

/** Replaces `{name}` placeholders. */
export function fmt(text: string, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), text);
}

export type PluralForm = "one" | "few" | "other";
export interface PluralText { one: string; other: string; few?: string }
export type Translate = (key: string, fallback: string) => string;

/** The CLDR plural category for a locale, reduced to the forms we translate (zero/two/many fold into "other"). */
export function pluralForm(locale: string, n: number): PluralForm {
  let c: Intl.LDMLPluralRule = n === 1 ? "one" : "other";
  try { c = new Intl.PluralRules(locale).select(n); } catch { /* unknown locale: English rule */ }
  return c === "one" ? "one" : c === "few" ? "few" : "other";
}

/** `<base>.one|few|other` for `n` in `locale`, `{n}` and `vars` filled in. */
export function plural(t: Translate, locale: string, base: string, text: PluralText, n: number, vars: Record<string, string | number> = {}): string {
  const form = pluralForm(locale, n);
  return fmt(t(`${base}.${form}`, text[form] ?? text.other), { n, ...vars });
}

/** Marks an English fallback that is shown through a key built at the use site (`t(`prefix.${id}`, TABLE[id])`). Returns the text unchanged; the hard-coded-English guard treats it like a t() argument. */
export const fallback = (text: string): string => text;
