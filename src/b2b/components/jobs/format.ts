import { dateLocale } from "@/b2b/lib/tz-format";

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, locale: string, opts: Intl.DateTimeFormatOptions, key: string): Intl.DateTimeFormat {
  const k = `${tz}|${locale}|${key}`;
  let f = fmtCache.get(k);
  if (!f) { f = new Intl.DateTimeFormat(dateLocale(locale), { timeZone: tz, ...opts }); fmtCache.set(k, f); }
  return f;
}

const DAY: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
const dayOf = (d: Date, tz: string, locale: string) => fmt(tz, locale, DAY, "d").format(d);
const timeOf = (d: Date, tz: string, locale: string) => fmt(tz, locale, TIME, "t").format(d);

/** "12 Oct, 09:00–11:30" in the org timezone and the app language ("—" when unscheduled). */
export function formatWindow(start: string | null | undefined, end: string | null | undefined, tz: string, locale = "en"): string {
  if (!start) return "—";
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "—";
  const e = end ? new Date(end) : null;
  if (!e || Number.isNaN(e.getTime())) return `${dayOf(s, tz, locale)}, ${timeOf(s, tz, locale)}`;
  const sameDay = dayOf(s, tz, locale) === dayOf(e, tz, locale);
  return `${dayOf(s, tz, locale)}, ${timeOf(s, tz, locale)}–${sameDay ? "" : `${dayOf(e, tz, locale)}, `}${timeOf(e, tz, locale)}`;
}

export function formatDateTime(iso: string | null | undefined, tz: string, locale = "en"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${dayOf(d, tz, locale)}, ${timeOf(d, tz, locale)}`;
}

/**
 * "just now", "42 s ago", "5 min ago", "3 h ago", "2 d ago". English keeps these short forms; the other languages use
 * Intl.RelativeTimeFormat ("acum 5 min.", "hace 3 h").
 */
export function ago(thenMs: number, nowMs: number, locale = "en"): string {
  const s = Math.max(0, Math.round((nowMs - thenMs) / 1000));
  if (locale && locale !== "en") {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
    if (s < 5) return rtf.format(0, "second");
    if (s < 60) return rtf.format(-s, "second");
    if (s < 3600) return rtf.format(-Math.floor(s / 60), "minute");
    if (s < 86400) return rtf.format(-Math.floor(s / 3600), "hour");
    return rtf.format(-Math.floor(s / 86400), "day");
  }
  if (s < 5) return "just now";
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
