// Money for the B2B UI. The API stores integer MINOR units of the company's currency: 12345 EUR-cents = 123.45, 12345 JPY = 12,345,
// 12345 KWD-fils = 12.345. The number of digits comes from the currency (ISO 4217), never from a fixed 100. Floats never go on the wire:
// text is parsed to an integer, and shown with Intl in the user's locale. There is no default currency here: callers pass the company's.

/** 0 … 1,000,000,000 minor units (the API's limit per field). */
export const MONEY_MAX_MINOR = 1_000_000_000;
const FALLBACK_DIGITS = 2;

/** Fraction digits of a currency (EUR 2, JPY 0, KWD 3). An unknown or missing code gets the usual two. */
export function minorUnitsOf(currency?: string | null): number {
  if (!currency) return FALLBACK_DIGITS;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? FALLBACK_DIGITS;
  } catch {
    return FALLBACK_DIGITS;
  }
}

type NumberPartType = Intl.NumberFormatPartTypes;
function sign(locale: string, type: NumberPartType, fallback: string): string {
  try {
    return new Intl.NumberFormat(locale).formatToParts(11111.1).find((p) => p.type === type)?.value ?? fallback;
  } catch {
    return fallback;
  }
}
const decimalSign = (locale: string) => sign(locale, "decimal", ".");
const groupSign = (locale: string) => sign(locale, "group", ",");

/** "€1,234.56" / "1.234,56 RON" / "JP¥1,235": whatever the user's language writes. Negative amounts keep their minus sign. */
export function formatMoney(minor: number, currency: string, locale: string): string {
  const digits = minorUnitsOf(currency);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 10 ** digits);
  } catch {
    return `${(minor / 10 ** digits).toFixed(digits)} ${currency}`;
  }
}

/** The number alone (the currency's digits, grouped): for tables whose column header already names the currency. */
export function formatAmount(minor: number, locale: string, currency?: string | null): string {
  const digits = minorUnitsOf(currency);
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(minor / 10 ** digits);
}

export function formatPercent(pct: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(pct)}%`;
}

/** Value for an <input>: the currency's digits, the locale's decimal sign, no grouping. */
export function moneyToInput(minor: number | null | undefined, locale: string, currency?: string | null): string {
  if (minor === null || minor === undefined) return "";
  const digits = minorUnitsOf(currency);
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false }).format(minor / 10 ** digits);
}

export type MoneyParse = { ok: true; minor: number | null } | { ok: false; reason: "format" | "range" };

/**
 * Typed amount -> minor units of `currency`. Empty = not set (null). Accepts "." or "," as the decimal sign: when both appear the last
 * one is the decimal; a single one is decimal unless it is the locale's group sign followed by exactly three digits ("1.234" in ro).
 * A currency without decimals (JPY) treats every separator as a group sign; more decimals than the currency has are refused.
 */
export function parseMoney(text: string, locale = "en", currency?: string | null): MoneyParse {
  const digitsAllowed = minorUnitsOf(currency);
  const raw = text.replace(/[\s  ']/g, "");
  if (raw === "") return { ok: true, minor: null };
  if (!/^[\d.,]+$/.test(raw)) return { ok: false, reason: "format" };
  const lastDot = raw.lastIndexOf(".");
  const lastComma = raw.lastIndexOf(",");
  let decimalAt = -1;
  if (digitsAllowed > 0) {
    if (lastDot >= 0 && lastComma >= 0) decimalAt = Math.max(lastDot, lastComma);
    else if (lastDot >= 0 || lastComma >= 0) {
      const ch = lastDot >= 0 ? "." : ",";
      const count = raw.split(ch).length - 1;
      const at = raw.lastIndexOf(ch);
      const after = raw.length - at - 1;
      if (count === 1) decimalAt = after === 3 && ch === groupSign(locale) && ch !== decimalSign(locale) ? -1 : at;
    }
  }
  const whole = decimalAt >= 0 ? raw.slice(0, decimalAt) : raw;
  const frac = decimalAt >= 0 ? raw.slice(decimalAt + 1) : "";
  // Everything left of the decimal sign may only hold digits and (consistent) group separators.
  if (decimalAt >= 0 && /[.,]/.test(raw.slice(0, decimalAt)) && new Set(raw.slice(0, decimalAt).match(/[.,]/g)).size > 1) return { ok: false, reason: "format" };
  const digits = whole.replace(/[.,]/g, "");
  if (!/^\d+$/.test(digits) && !(digits === "" && frac !== "")) return { ok: false, reason: "format" };
  if (!new RegExp(`^\\d{0,${digitsAllowed}}$`).test(frac)) return { ok: false, reason: "format" };
  if (decimalAt >= 0 && /[.,]/.test(frac)) return { ok: false, reason: "format" };
  // Group separators must make sense: groups of three after the first.
  if (/[.,]/.test(whole) && !/^\d{1,3}([.,]\d{3})+$/.test(whole)) return { ok: false, reason: "format" };
  const minor = Number(digits || "0") * 10 ** digitsAllowed + (digitsAllowed > 0 ? Number((frac + "0".repeat(digitsAllowed)).slice(0, digitsAllowed)) : 0);
  if (!Number.isSafeInteger(minor)) return { ok: false, reason: "range" };
  return minor > MONEY_MAX_MINOR ? { ok: false, reason: "range" } : { ok: true, minor };
}

export interface Margin { margin: number; pct: number | null }

/** price − cost, and the margin as a percentage of price (one decimal). Blank (null) while either side is unknown. */
export function computeMargin(price: number | null | undefined, cost: number | null | undefined): Margin | null {
  if (typeof price !== "number" || typeof cost !== "number") return null;
  const margin = price - cost;
  return { margin, pct: price > 0 ? Math.round((margin / price) * 1000) / 10 : null };
}

/** A money amount split so the currency code can sit above the figure: the figure never breaks across lines, the code is a small label. */
export function moneyParts(minor: number, currency: string, locale: string): { code: string; figure: string } {
  const digits = minorUnitsOf(currency);
  const plain = (minor / 10 ** digits).toFixed(digits);
  try {
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "code" }).formatToParts(minor / 10 ** digits);
    const code = parts.filter((p) => p.type === "currency").map((p) => p.value).join("").trim();
    // Without the literal spaces around the code: "-EUR 160.00" -> "-160.00".
    const figure = parts.filter((p) => p.type !== "currency" && p.type !== "literal").map((p) => p.value).join("");
    return { code: code || currency, figure: figure || plain };
  } catch {
    return { code: currency, figure: plain };
  }
}
