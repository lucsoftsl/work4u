// Pure helpers shared by the post-job / post-service wizards.

const LOCALE_CURRENCY: Readonly<Record<string, string>> = { en: "USD", fr: "EUR", es: "EUR", hu: "HUF", ro: "RON" };

/** Default currency for a UI locale (not hardcoded USD). */
export function defaultCurrencyForLocale(locale: string | null | undefined): string {
  return (locale && LOCALE_CURRENCY[locale]) || "USD";
}

/** A usable coordinate pair: finite, in range and not the (0,0) "unset" placeholder (F9). */
export function hasRealCoordinates(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  return !(lat === 0 && lng === 0);
}

/** Parses a user-entered amount; returns null unless it is a finite number > 0. */
export function parsePositiveAmount(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Progress 0..100 for "step n of total". */
export function stepProgress(step: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(Math.max(step, 0), total) / total) * 100);
}

/** First key of `order` that has an error message. */
export function firstErrorKey<K extends string>(order: readonly K[], errors: Partial<Record<K, string | undefined>>): K | null {
  return order.find((key) => Boolean(errors[key])) ?? null;
}

/** Moves focus to an element by id after the next paint (errors render first). */
export function focusFieldById(id: string): void {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => document.getElementById(id)?.focus());
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable: the draft is a convenience only
  }
}

export function clearDraft(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
