/** Pick-lists shared by the company start wizard and the company profile. */
export const COUNTRY_CODES = ["RO", "ES", "FR", "DE", "IT", "PT", "HU", "BG", "PL", "NL", "BE", "AT", "GR", "IE", "GB", "CZ", "SK", "HR", "SI", "DK", "SE", "FI"] as const;
export const ORG_LANGUAGES = ["en", "ro", "es", "fr", "hu"] as const;
export type OrgLanguage = (typeof ORG_LANGUAGES)[number];

export function timeZones(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone");
    if (list?.length) return list;
  } catch { /* old browser */ }
  return ["UTC"];
}

/** Country names in the viewer's language (falls back to the code), sorted for that language. A saved country outside the list stays selectable. */
export function countryOptions(locale: string, current?: string | null): Array<{ code: string; label: string }> {
  let dn: Intl.DisplayNames | null = null;
  try { dn = new Intl.DisplayNames([locale], { type: "region" }); } catch { /* codes only */ }
  const codes: string[] = [...COUNTRY_CODES];
  if (current && !codes.includes(current)) codes.push(current);
  return codes.map((code) => ({ code, label: dn?.of(code) ?? code })).sort((a, b) => a.label.localeCompare(b.label, locale));
}

/** A language's own name ("English", "Română", "Español"). Intl returns most names lower-case; a picker lists them capitalised. */
export function languageLabel(lang: string): string {
  let name = lang;
  try { name = new Intl.DisplayNames([lang], { type: "language" }).of(lang) ?? lang; } catch { /* the code itself */ }
  return name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
}
