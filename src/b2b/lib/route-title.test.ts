import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import en from "@/locales/en.json";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import { ROUTE_TITLES, routeTitle } from "./route-title";

const APP = path.resolve(__dirname, "../../app/(b2b)");
const DICTS = { en, ro, es } as Record<string, Record<string, string>>;

function pagesUnder(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) pagesUnder(p, out);
    else if (e.name === "page.tsx") out.push(p);
  }
  return out;
}

/** src/app/(b2b)/ops/(gated)/[orgId]/jobs/[jobId]/page.tsx -> /ops/org1/jobs/job1 */
function urlOf(file: string): string {
  const rel = path.relative(APP, path.dirname(file)).split(path.sep);
  const segs = rel.filter((s) => s && !/^\(.*\)$/.test(s)).map((s) => (s.startsWith("[...") ? "nope" : s.startsWith("[") ? `${s.slice(1, -1)}1` : s));
  return "/" + segs.join("/");
}

const NOT_FOUND_PAGES = ["/b2b/nope", "/ops/orgId1/nope", "/tech/orgId1/nope", "/b2b/not-found-page"];

describe("every B2B page has a localized title", () => {
  const pages = pagesUnder(APP).map((f) => ({ file: path.relative(APP, f), url: urlOf(f), source: fs.readFileSync(f, "utf8") }));

  it("finds the pages", () => expect(pages.length).toBeGreaterThan(25));

  it.each(pages.map((p) => [p.url, p] as const))("%s", (_url, p) => {
    if (NOT_FOUND_PAGES.includes(p.url)) {
      // 404 pages: no route title; they render the 404 view, which sets "Page not found" itself
      expect(routeTitle(p.url), p.file).toBeNull();
      expect(/notFound\(\)|B2bNotFoundView/.test(p.source), `${p.file} must end in the 404 view`).toBe(true);
      return;
    }
    const title = routeTitle(p.url);
    expect(title, `${p.file} (${p.url}) has no title entry in lib/route-title.ts`).not.toBeNull();
    for (const lang of ["en", "ro", "es"]) expect(DICTS[lang][title!.key], `${lang} ${title!.key}`).toBeTruthy();
  });

  it("unknown addresses have no title (the 404 view names them)", () => {
    for (const url of ["/ops/o/whatever", "/ops/o/jobs/j/extra", "/tech/o/whatever", "/b2b/other"]) expect(routeTitle(url), url).toBeNull();
  });

  it("the technician job and the ops job are marked as job pages", () => {
    expect(routeTitle("/ops/o/jobs/j")?.job).toBe(true);
    expect(routeTitle("/tech/o/jobs/j")?.job).toBe(true);
    expect(routeTitle("/ops/o/jobs")?.job).toBeUndefined();
  });

  it("every title key reads in Romanian and Spanish, not English", () => {
    for (const [key, text] of Object.entries(ROUTE_TITLES)) {
      expect(en[key as keyof typeof en], key).toBe(text);
      for (const lang of ["ro", "es"]) {
        expect(DICTS[lang][key], `${lang} ${key}`).toBeTruthy();
        if (text.length > 5) expect(DICTS[lang][key], `${lang} ${key}`).not.toBe(text);
      }
    }
  });
});
