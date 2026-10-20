import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import en from "@/locales/en.json";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import type { TimelineEntry } from "@/b2b/api/types";
import { describeTimelineEntry } from "./workspace";
import { TIMELINE_ACTIONS } from "./timeline-events";

const DICTS = { en, ro, es } as Record<string, Record<string, string>>;
const entry = (action: string): TimelineEntry =>
  ({ id: "e", action, category: "TEAM", occurredAt: "2026-10-20T10:00:00Z", actor: { type: "USER", name: "Ana Pop" }, oldValue: null, newValue: null, metadata: null } as unknown as TimelineEntry);

/** A translator that records every key the sentence asked for. */
function probe(lang: string) {
  const dict = DICTS[lang];
  const asked: string[] = [];
  const t = (key: string, fallback: string) => { asked.push(key); return dict[key] ?? fallback; };
  return { asked, i18n: { t, locale: lang } };
}

describe("every timeline event type the API writes has a label in en, ro and es", () => {
  it.each(TIMELINE_ACTIONS)("%s", (action) => {
    const english = describeTimelineEntry(entry(action), "UTC").text;
    for (const lang of ["en", "ro", "es"]) {
      const { asked, i18n } = probe(lang);
      const text = describeTimelineEntry(entry(action), "UTC", i18n).text;
      expect(asked.length, `${lang} ${action} asks for a key`).toBeGreaterThan(0);
      for (const key of asked) expect(DICTS[lang][key], `${lang}: ${key}`).toBeTruthy();
      expect(text.length).toBeGreaterThan(0);
      if (lang !== "en") expect(text, `${lang} ${action} must not stay English`).not.toBe(english);
    }
  });
  it("an event the app does not know yet shows a translated generic word outside English, not a raw code", () => {
    const { i18n } = probe("ro");
    expect(describeTimelineEntry(entry("job.something_new"), "UTC", i18n).text).toBe(ro["b2b.timeline.event"]);
  });
  it("the list matches what work4u-api writes (skipped when the API repo is not next to this one)", () => {
    const dir = path.resolve(process.cwd(), "../work4u-api/src/b2b");
    if (!fs.existsSync(dir)) return;
    const found = new Set<string>();
    const walk = (d: string) => {
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, f.name);
        if (f.isDirectory()) walk(p);
        else if (/\.ts$/.test(f.name) && !/\.test\.ts$/.test(f.name)) {
          for (const m of fs.readFileSync(p, "utf8").matchAll(/\b(?:action|type|audit):\s*'(job\.[a-z_]+)'/g)) found.add(m[1]);
        }
      }
    };
    walk(dir);
    // permission names, not timeline events
    const known = new Set<string>(TIMELINE_ACTIONS);
    const unknown = [...found].filter((a) => !known.has(a));
    expect(unknown, "new event types need a timeline label: add them to TIMELINE_ACTIONS and the locale files").toEqual([]);
  });
});
