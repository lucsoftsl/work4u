// Date/time formatting in the ORG timezone (a technician's phone may be in another zone).

const safeTz = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
};

export function formatClock(iso: string | null | undefined, tz: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: safeTz(tz) }).format(new Date(iso));
}

/** "14:00–15:30", "from 14:00" or "no time set". */
export function formatWindow(start: string | null | undefined, end: string | null | undefined, tz: string): string {
  if (!start) return "no time set";
  return end ? `${formatClock(start, tz)}–${formatClock(end, tz)}` : `from ${formatClock(start, tz)}`;
}

/** "Today, Tue 14 Oct". */
export function formatDayLong(iso: string, tz: string): string {
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: safeTz(tz) }).format(new Date(iso));
  return `Today, ${day}`;
}
