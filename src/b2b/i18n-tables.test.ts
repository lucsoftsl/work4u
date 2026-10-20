import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import { PRESETS } from "@/b2b/lib/job-filters";
import { OPS_NAV as NAV } from "@/b2b/lib/nav";
import { BUCKETS } from "@/b2b/components/dashboard/BucketCards";
import { EMPTY_COPY } from "@/b2b/components/RoleEmptyState";
import { NOTIFICATION_KINDS } from "@/b2b/lib/notifications";
import { SYNC_STATUS_LABELS } from "@/b2b/components/tech/SyncView";
import { WEEKDAY_LABEL } from "@/b2b/lib/working-hours";
import { CATEGORY_SUGGESTIONS } from "@/b2b/lib/job-form";
import { GONE } from "@/b2b/lib/catalog";
import { COMPLETION_LABEL } from "@/b2b/lib/tech-actions";
import { ATTACHMENT_CATEGORIES, CONFLICT_LABELS, categoryLabel } from "@/b2b/lib/workspace";

// Screens that pick a label from a table by a built key (`t(`b2b.x.${id}`, fallback)`) cannot be seen by the literal-key scan.
// Each such table is listed here: every row needs a key in en (equal to the in-code English), ro and es.
type Row = readonly [key: string, fallback: string];
const DICTS = { en, ro, es } as Record<string, Record<string, string>>;

const TABLES: Record<string, Row[]> = {
  "jobs quick tabs": PRESETS.map((p) => [`b2b.jobs.preset.${p.key}`, p.label] as Row),
  "ops navigation": NAV.map((n) => [n.labelKey, n.label] as Row),
  "dashboard bucket names": BUCKETS.map((b) => [`b2b.dashboard.bucket.${b.key}`, b.label] as Row),
  "dashboard bucket hints": BUCKETS.map((b) => [`b2b.dashboard.bucketHint.${b.key}`, b.hint] as Row),
  "notification kinds": NOTIFICATION_KINDS.map(([k, label]) => [`b2b.notifications.kind.${k}`, label] as Row),
  "schedule conflicts": Object.entries(CONFLICT_LABELS).map(([k, label]) => [`b2b.conflict.${k}`, label] as Row),
  "file categories": ATTACHMENT_CATEGORIES.map((c) => [`b2b.files.cat.${c}`, categoryLabel(c)] as Row),
  "weekday names": Object.entries(WEEKDAY_LABEL).map(([d, label]) => [`b2b.teams.day.${d}`, label] as Row),
  "job categories": CATEGORY_SUGGESTIONS.map((c) => [`b2b.newJob.cat.${c.toLowerCase()}`, c] as Row),
  "catalog: item no longer exists": Object.entries(GONE).map(([s, label]) => [`b2b.catalog.err.gone.${s}`, label] as Row),
  "completion hints": Object.entries(COMPLETION_LABEL).map(([k, label]) => [`b2b.tech.completion.${k}`, label] as Row),
  "sync queue statuses": SYNC_STATUS_LABELS.map(([k, label]) => [`b2b.sync.status.${k}`, label] as Row),
  "empty states": Object.entries(EMPTY_COPY).flatMap(([v, c]) => [
    [`b2b.empty.${v}.title`, c.title] as Row,
    [`b2b.empty.${v}.body`, c.body] as Row,
    ...(c.action ? [[`b2b.empty.${v}.action`, c.action.label] as Row] : []),
  ]),
};

describe("label tables have a key in en, ro and es", () => {
  for (const [name, rows] of Object.entries(TABLES)) {
    it(name, () => {
      expect(rows.length).toBeGreaterThan(0);
      for (const [key, fallback] of rows) {
        expect(en[key as keyof typeof en], `en ${key}`).toBe(fallback);
        for (const lang of ["ro", "es"]) {
          expect(DICTS[lang][key], `${lang} ${key}`).toBeTruthy();
          if (fallback.length > 6 && !/^[A-Z0-9 ]+$/.test(fallback)) expect(DICTS[lang][key], `${lang} ${key} is still English`).not.toBe(fallback);
        }
      }
    });
  }
});

// 320/375 px: these labels sit in narrow cells (two-column bucket cards, scrolling tab strip, quick tabs, technician buttons). Text wraps
// between words, so what matters is that no single word is longer than a narrow cell (about 114 px = 14 characters at 12-14 px bold).
describe("Romanian and Spanish words fit narrow cells at 320/375", () => {
  const CRAMPED = ["b2b.dashboard.bucket.", "b2b.dashboard.bucketHint.", "b2b.job.tab.", "b2b.jobs.preset.", "b2b.tech.step.", "b2b.status.job.", "b2b.nav."];
  const MAX_WORD = 14;
  it.each(["ro", "es"])("%s", (lang) => {
    const long = Object.entries(DICTS[lang])
      .filter(([k]) => CRAMPED.some((p) => k.startsWith(p)))
      .flatMap(([k, v]) => v.split(/\s+/).map((w) => [k, w.replace(/[.,;:()„”«»]/g, "")] as const))
      .filter(([, w]) => w.length > MAX_WORD);
    expect(long).toEqual([]);
  });
});
