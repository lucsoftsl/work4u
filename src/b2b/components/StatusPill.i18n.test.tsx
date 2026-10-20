import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import en from "@/locales/en.json";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import { JOB_STATUS_META } from "@/b2b/lib/status";
import type { JobStatus } from "@/b2b/api/types";
import { techPlan } from "@/b2b/lib/tech-actions";

const lang = vi.hoisted(() => ({ dict: {} as Record<string, string>, locale: "en" }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: lang.locale, t: (k: string, f?: string) => lang.dict[k] ?? f ?? k }) }));
import { StatusPill } from "./StatusPill";

const DICTS = { en, ro, es } as Record<string, Record<string, string>>;
const use = (locale: "en" | "ro" | "es") => { lang.locale = locale; lang.dict = DICTS[locale]; };
afterEach(() => use("en"));

const STATUSES = Object.keys(JOB_STATUS_META) as JobStatus[];
// At 320 px the page keeps 16 px gutters; a 12 px bold label is about 7.5 px per character. The pill must leave room for its icon and
// padding, so a label longer than this would have to wrap onto a second line (which the pill allows) instead of running off screen.
const SINGLE_LINE_CHARS_AT_320 = 32;

describe("StatusPill at 320/375 with the longer Romanian and Spanish words", () => {
  it.each(["ro", "es"] as const)("%s: every status is shown in its own language, never the English label", (locale) => {
    use(locale);
    for (const status of STATUSES) {
      const { container, unmount } = render(<StatusPill status={status} />);
      const shown = container.textContent ?? "";
      expect(shown, status).toBe(DICTS[locale][`b2b.status.job.${status}`]);
      unmount();
    }
  });
  it.each(["en", "ro", "es"] as const)("%s: the pill can shrink and wrap, so no word can push past a 320 px screen", (locale) => {
    use(locale);
    for (const status of STATUSES) {
      const { container, unmount } = render(<StatusPill status={status} />);
      const pill = container.firstElementChild as HTMLElement;
      expect(pill.className, status).toContain("max-w-full");
      const text = pill.lastElementChild as HTMLElement;
      expect(text.className, status).toContain("whitespace-normal");
      expect(text.className, status).toContain("break-words");
      expect((text.textContent ?? "").length, `${locale} ${status}`).toBeLessThanOrEqual(SINGLE_LINE_CHARS_AT_320);
      unmount();
    }
  });
  it.each(["ro", "es"] as const)("%s: technician action buttons keep short labels on a 320 px screen", (locale) => {
    use(locale);
    const t = (k: string, f: string) => lang.dict[k] ?? f;
    for (const status of STATUSES) {
      const plan = techPlan(status, t);
      if (plan.primary) expect(plan.primary.label.length, `${locale} ${status} ${plan.primary.label}`).toBeLessThanOrEqual(28);
    }
  });
});
