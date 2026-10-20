import { describe, expect, it } from "vitest";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import { dateLocale, formatClock, formatDayLong, formatWindow } from "./tz-format";

const T = (d: unknown) => (k: string, f: string) => (d as Record<string, string>)[k] ?? f;
const NOON = "2026-10-20T10:00:00Z"; // a Tuesday; 13:00 in Bucharest (UTC+3)

describe("dates and times follow the app language", () => {
  it("English keeps the day-first form it always had", () => {
    expect(formatDayLong(NOON, "Europe/Bucharest")).toBe("Today, Tue 20 Oct");
    expect(formatDayLong(NOON, "Europe/Bucharest", { locale: "en", t: (_k, f) => f })).toBe("Today, Tue 20 Oct");
    expect(dateLocale("en")).toBe("en-GB");
  });
  it("Romanian: 'Azi', Romanian weekday and month, never the English ones", () => {
    const s = formatDayLong(NOON, "Europe/Bucharest", { locale: "ro", t: T(ro) });
    expect(s).toMatch(/^Azi, /);
    expect(s).toMatch(/20/);
    expect(s).toMatch(/oct/i);
    expect(s).not.toMatch(/Tue|Today/);
  });
  it("Spanish: 'Hoy', Spanish weekday and month", () => {
    const s = formatDayLong(NOON, "Europe/Madrid", { locale: "es", t: T(es) });
    expect(s).toMatch(/^Hoy, /);
    expect(s).toMatch(/mar/i);
    expect(s).toMatch(/oct/i);
    expect(s).not.toMatch(/Tue|Today/);
  });
  it("uses the company's timezone, not the phone's: late UTC is already tomorrow in Bucharest", () => {
    expect(formatDayLong("2026-10-20T22:30:00Z", "Europe/Bucharest", { locale: "en", t: (_k, f) => f })).toBe("Today, Wed 21 Oct");
  });
  it("clock times are 24 h in every language", () => {
    expect(formatClock(NOON, "Europe/Bucharest")).toBe("13:00");
    expect(formatClock(NOON, "Europe/Bucharest", "ro")).toBe("13:00");
    expect(formatClock(NOON, "Europe/Madrid", "es")).toBe("12:00");
    expect(formatClock(null, "UTC")).toBe("—");
  });
  it("job windows: 'no time set' and 'from' are words in the language too", () => {
    const end = "2026-10-20T11:30:00Z";
    expect(formatWindow(NOON, end, "Europe/Bucharest", { locale: "ro", t: T(ro) })).toBe("13:00–14:30");
    expect(formatWindow(null, null, "UTC")).toBe("no time set");
    expect(formatWindow(null, null, "UTC", { locale: "ro", t: T(ro) })).toBe("fără oră stabilită");
    expect(formatWindow(NOON, null, "Europe/Bucharest", { locale: "ro", t: T(ro) })).toBe("de la 13:00");
    expect(formatWindow(NOON, null, "Europe/Madrid", { locale: "es", t: T(es) })).toBe("desde las 12:00");
    expect(formatWindow(NOON, null, "Europe/Bucharest")).toBe("from 13:00");
  });
});
