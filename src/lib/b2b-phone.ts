const STRIP = /[\s().-]/g;
const E164 = /^\+[1-9]\d{6,14}$/;
const NATIONAL = /^\d{6,14}$/;

/** Removes spaces, dashes, dots and brackets ("+34 600-555-021" → "+34600555021"). */
export const compactPhone = (raw: string): string => raw.replace(STRIP, "");

/**
 * Client-side plausibility check, mirroring what the API accepts: an international number ("+34 600 555 021"), or a national number
 * when the company's country is known (the API reads it with that country). Empty is fine (the field is optional). The API validates again.
 */
export function isPlausiblePhone(raw: string, country?: string | null): boolean {
  const v = compactPhone(raw);
  if (!v) return true;
  if (v.startsWith("+")) return E164.test(v);
  return !!country && NATIONAL.test(v);
}
