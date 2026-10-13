const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, opts: Intl.DateTimeFormatOptions, key: string): Intl.DateTimeFormat {
  const k = `${tz}|${key}`;
  let f = fmtCache.get(k);
  if (!f) { f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opts }); fmtCache.set(k, f); }
  return f;
}

const DAY: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
const dayOf = (d: Date, tz: string) => fmt(tz, DAY, "d").format(d);
const timeOf = (d: Date, tz: string) => fmt(tz, TIME, "t").format(d);

/** "12 Oct, 09:00–11:30" in the org timezone ("—" when unscheduled). */
export function formatWindow(start: string | null | undefined, end: string | null | undefined, tz: string): string {
  if (!start) return "—";
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "—";
  const e = end ? new Date(end) : null;
  if (!e || Number.isNaN(e.getTime())) return `${dayOf(s, tz)}, ${timeOf(s, tz)}`;
  const sameDay = dayOf(s, tz) === dayOf(e, tz);
  return `${dayOf(s, tz)}, ${timeOf(s, tz)}–${sameDay ? "" : `${dayOf(e, tz)}, `}${timeOf(e, tz)}`;
}

export function formatDateTime(iso: string | null | undefined, tz: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${dayOf(d, tz)}, ${timeOf(d, tz)}`;
}

/** "just now", "42 s ago", "5 min ago", "3 h ago", "2 d ago". */
export function ago(thenMs: number, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - thenMs) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
