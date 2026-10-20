import { describe, expect, it } from "vitest";
import { ago, formatDateTime, formatWindow } from "./format";

const NOW = Date.parse("2026-10-20T10:00:00Z");

describe("relative times and windows in the list", () => {
  it("English is unchanged", () => {
    expect(ago(NOW - 2000, NOW)).toBe("just now");
    expect(ago(NOW - 42_000, NOW)).toBe("42 s ago");
    expect(ago(NOW - 5 * 60_000, NOW)).toBe("5 min ago");
    expect(ago(NOW - 3 * 3600_000, NOW)).toBe("3 h ago");
    expect(ago(NOW - 2 * 86400_000, NOW)).toBe("2 d ago");
  });
  it("Romanian and Spanish use Intl.RelativeTimeFormat, not English abbreviations", () => {
    for (const [locale, ms] of [["ro", 5 * 60_000], ["es", 5 * 60_000], ["ro", 3 * 3600_000], ["es", 3 * 86400_000]] as const) {
      const s = ago(NOW - ms, NOW, locale);
      expect(s, `${locale} ${ms}`).not.toMatch(/ago|min ago|\bh ago|\bd ago/);
      expect(s).toMatch(/\d/);
    }
    expect(ago(NOW - 5 * 60_000, NOW, "ro")).toMatch(/^acum 5 min/);
    expect(ago(NOW - 1000, NOW, "es")).toMatch(/ahora/i);
  });
  it("windows and date-times use the language's month names", () => {
    const start = "2026-10-20T10:00:00Z", end = "2026-10-20T11:30:00Z";
    expect(formatWindow(start, end, "UTC")).toBe("20 Oct, 10:00–11:30");
    expect(formatWindow(start, end, "UTC", "ro")).toMatch(/^20 oct/i);
    expect(formatDateTime(start, "UTC", "es")).toMatch(/^20 oct/i);
    expect(formatDateTime(null, "UTC", "ro")).toBe("—");
  });
});
