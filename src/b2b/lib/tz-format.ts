import type { Translate } from "./plural";

// Date/time formatting in the ORG timezone (a technician's phone may be in another zone) and in the app language. English stays
// day-first ("Tue 20 Oct", en-GB); the other languages use their own month and weekday names.

export interface Lang { locale?: string; t?: Translate }
const english: Translate = (_key, fallback) => fallback;

/** Intl locale for an app language: "en" reads day-first like the rest of the console; everything else is itself. */
export const dateLocale = (locale = "en"): string => (locale === "en" ? "en-GB" : locale);

const safeTz = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
};

export function formatClock(iso: string | null | undefined, tz: string, locale = "en"): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(dateLocale(locale), { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: safeTz(tz) }).format(new Date(iso));
}

/** "14:00–15:30", "from 14:00" or "no time set". */
export function formatWindow(start: string | null | undefined, end: string | null | undefined, tz: string, lang: Lang = {}): string {
  const t = lang.t ?? english;
  if (!start) return t("b2b.tech.window.none", "no time set");
  const clock = (iso: string) => formatClock(iso, tz, lang.locale);
  return end ? `${clock(start)}–${clock(end)}` : t("b2b.tech.window.from", "from {time}").replace("{time}", clock(start));
}

/** "Today, Tue 14 Oct" (Romanian "Azi, mar., 14 oct."). */
export function formatDayLong(iso: string, tz: string, lang: Lang = {}): string {
  const t = lang.t ?? english;
  const date = new Intl.DateTimeFormat(dateLocale(lang.locale), { weekday: "short", day: "numeric", month: "short", timeZone: safeTz(tz) }).format(new Date(iso));
  return t("b2b.tech.today.dayLong", "Today, {date}").replace("{date}", date);
}
