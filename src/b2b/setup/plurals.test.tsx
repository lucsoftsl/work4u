import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { renderHook } from "@testing-library/react";
import ro from "@/locales/ro.json";
import es from "@/locales/es.json";
import en from "@/locales/en.json";

const dict = vi.hoisted(() => ({ cur: {} as Record<string, string>, locale: "en" }));
vi.mock("@/lib/i18n", () => ({ useTranslation: () => ({ locale: dict.locale, t: (k: string, f?: string) => dict.cur[k] ?? f ?? k }) }));
import { useTr } from "./i18n";
import { plural } from "@/b2b/lib/plural";
import { statusBarView } from "@/b2b/offline/status-bar";
import { timerSpeech } from "@/b2b/lib/work-time";

const useLang = (locale: "ro" | "es" | "en") => {
  dict.locale = locale;
  dict.cur = (locale === "ro" ? ro : locale === "es" ? es : en) as Record<string, string>;
  return renderHook(useTr).result.current.trn;
};
afterEach(() => { dict.locale = "en"; });

// Each call is written the way the code writes it: the English fallbacks only, WITHOUT a `few` text. The Romanian form must still come
// from ro.json (1 = one, 0 and 2-19 = few, 20+ = other, with "de").
const cases = [
  { base: "b2b.jobTypes.jobs", text: { one: "{n} job", other: "{n} jobs" }, noun: "lucrare", nounPl: "lucrări" },
  { base: "b2b.finance.live", text: { one: "Showing {n} job", other: "Showing {n} jobs" }, noun: "lucrare", nounPl: "lucrări" },
  { base: "b2b.finance.kpi.revenueNote", text: { one: "{n} job completed", other: "{n} jobs completed" }, noun: "lucrare", nounPl: "lucrări" },
];

describe("Romanian plurals: 1, 2-19 and 20+ (with 'de')", () => {
  it.each(cases)("$base", ({ base, text, nounPl }) => {
    const trn = useLang("ro");
    for (const n of [0, 2, 3, 7, 19, 101, 102, 119]) expect(trn(base, text, n), String(n)).toMatch(new RegExp(`${n} ${nounPl}`));
    for (const n of [20, 21, 45, 100, 120, 200]) expect(trn(base, text, n), String(n)).toMatch(new RegExp(`${n} de ${nounPl}`));
    expect(trn(base, text, 1)).toMatch(/1 lucrare/);
  });
  it("the currency lock parts and the archive confirmation too", () => {
    const trn = useLang("ro");
    const jobs = { one: "{n} job has an amount", other: "{n} jobs have amounts" };
    expect(trn("b2b.setup.currency.jobsPart", jobs, 1)).toBe("1 lucrare are o sumă");
    expect(trn("b2b.setup.currency.jobsPart", jobs, 7)).toBe("7 lucrări au sume");
    expect(trn("b2b.setup.currency.jobsPart", jobs, 20)).toBe("20 de lucrări au sume");
    const types = { one: "{n} job type has a default price", other: "{n} job types have default prices" };
    expect(trn("b2b.setup.currency.typesPart", types, 7)).toBe("7 tipuri de lucrări au prețuri implicite");
    expect(trn("b2b.setup.currency.typesPart", types, 25)).toBe("25 de tipuri de lucrări au prețuri implicite");
    const gap = { one: "{n} job has no cost", other: "{n} jobs have no cost" };
    expect(trn("b2b.finance.hint.cost", gap, 3)).toBe("3 lucrări nu au cost");
    expect(trn("b2b.finance.hint.cost", gap, 21)).toBe("21 de lucrări nu au cost");
  });
  it("Spanish: one for 1, the plural for everything else", () => {
    const trn = useLang("es");
    const t = { one: "{n} job", other: "{n} jobs" };
    expect(trn("b2b.jobTypes.jobs", t, 1)).toBe("1 trabajo");
    for (const n of [0, 2, 20, 1_000_000]) expect(trn("b2b.jobTypes.jobs", t, n)).toBe(`${n} trabajos`);
    expect(trn("b2b.setup.currency.jobsPart", { one: "x", other: "y" }, 1)).toBe("1 trabajo tiene un importe");
    expect(trn("b2b.setup.currency.jobsPart", { one: "x", other: "y" }, 3)).toBe("3 trabajos tienen importes");
  });
});

describe("plural data guard", () => {
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [path.join(d, e.name)] : []));
  const SRC = path.join(__dirname, "..", "..");
  const bases = new Set<string>();
  for (const f of walk(SRC)) for (const m of fs.readFileSync(f, "utf8").matchAll(/\b(?:trn\(|plural\(\s*t\s*,\s*\w+\s*,)\s*"(b2b\.[A-Za-z0-9_.]+)"/g)) bases.add(m[1]);

  it("finds the plural lookups, including the technician app, dispatch board and offline bar", () => {
    expect(bases.size).toBeGreaterThan(30);
    for (const b of ["b2b.tech.today.jobCount", "b2b.tech.bar.changes", "b2b.tech.bar.attention", "b2b.sync.changes", "b2b.sync.items", "b2b.sync.photos", "b2b.dispatch.jobCount", "b2b.tech.job.photoCount", "b2b.tech.timer.hours"]) expect(bases.has(b), b).toBe(true);
  });
  it("no count is made plural by hand: no `.one` / `.other` key literals, no `n === 1 ? ...` word picking, no `s` suffix tricks", () => {
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      if (/lib[\\/]plural\.ts$/.test(f) || /[\\/]landing|[\\/](app[\\/])?\(public\)|components[\\/]ui[\\/]/.test(f)) continue;
      if (!/[\\/](b2b|\(b2b\)|b2b-auth|b2b-public)[\\/]/.test(f) && !/b2b/.test(f)) continue;
      const src = fs.readFileSync(f, "utf8");
      for (const re of [/"b2b\.[A-Za-z0-9_.]+\.(one|few)"/, /"b2b\.(?!tech\.pause\.reason)[A-Za-z0-9_.]+\.other"/, /\$\{[^}]*\.(one|other)\b[^}]*\}/, /=== 1 \? t\(/, /\? "one" : "other"/, /\$\{\w+ === 1 \? "" : "s"\}/, /"[A-Za-z0-9 ,.'{}]*[a-z]\(s\)[A-Za-z0-9 ,.'{}]*"/]) {
        const m = re.exec(src);
        if (m) offenders.push(`${path.relative(SRC, f)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
  it("every plural base used in code has one / few / other in Romanian, one / other in Spanish, and all forms in English", () => {
    const missing: string[] = [];
    for (const b of bases) {
      for (const f of ["one", "few", "other"]) if ((ro as Record<string, string>)[`${b}.${f}`] === undefined) missing.push(`ro ${b}.${f}`);
      for (const f of ["one", "other"]) if ((es as Record<string, string>)[`${b}.${f}`] === undefined) missing.push(`es ${b}.${f}`);
      for (const f of ["one", "few", "other"]) if ((en as Record<string, string>)[`${b}.${f}`] === undefined) missing.push(`en ${b}.${f}`);
    }
    expect(missing).toEqual([]);
  });
  it("Romanian: the 'few' text (2-19) never has 'de' after the number; the 'other' text (20+) has it before a counted noun", () => {
    const wrong: string[] = [];
    for (const b of bases) {
      const few = (ro as Record<string, string>)[`${b}.few`] ?? "";
      const other = (ro as Record<string, string>)[`${b}.other`] ?? "";
      if (/\{n\} de /.test(few)) wrong.push(`${b}.few has "de"`);
      // {n} followed by a plural noun (lucrări, tipuri, persoane, clienți, rânduri, modificări...) needs "de" from 20 up
      if (/\{n\} (?!de |necesită|din |a |au |are )[a-zăâîșț]+(i|e|uri|ări|ți)\b/.test(other) && !/\{n\} de /.test(other)) wrong.push(`${b}.other lacks "de"`);
    }
    expect(wrong).toEqual([]);
  });
});

describe("the moved places, with the numbers that matter (0, 1, 2, 7, 19, 20, 21, 100, 119)", () => {
  const T = { ro: (k: string, f: string) => (ro as Record<string, string>)[k] ?? f, es: (k: string, f: string) => (es as Record<string, string>)[k] ?? f };
  const NS = [0, 1, 2, 7, 19, 20, 21, 100, 119];
  const ONE = { one: "{n} x", other: "{n} xs" };
  // base -> [singular noun, few noun, other noun] in Romanian
  const RO: Array<[string, string, string, string]> = [
    ["b2b.tech.today.jobCount", "lucrare", "lucrări", "de lucrări"],
    ["b2b.dispatch.jobCount", "lucrare", "lucrări", "de lucrări"],
    ["b2b.tech.bar.changes", "modificare", "modificări", "de modificări"],
    ["b2b.sync.changes", "modificare", "modificări", "de modificări"],
    ["b2b.sync.items", "element", "elemente", "de elemente"],
    ["b2b.sync.photos", "fotografie", "fotografii", "de fotografii"],
    ["b2b.team.bulk.result", "invitație", "invitații", "de invitații"],
    ["b2b.clients.merge.action", "client", "clienți", "de clienți"],
  ];
  it.each(RO)("ro %s", (base, one, few, other) => {
    for (const n of NS) {
      const text = plural(T.ro, "ro", base, ONE, n);
      const expected = n === 1 ? one : n === 0 || (n % 100 >= 1 && n % 100 <= 19 && n !== 1) ? few : other;
      expect(text, `${base} ${n}`).toContain(`${n} ${expected}`);
      if (n === 119 || n === 7) expect(text).not.toContain(" de ");
    }
  });
  it.each([
    ["b2b.tech.today.jobCount", "trabajo", "trabajos"],
    ["b2b.dispatch.jobCount", "trabajo", "trabajos"],
    ["b2b.tech.bar.changes", "cambio", "cambios"],
    ["b2b.sync.items", "elemento", "elementos"],
    ["b2b.sync.photos", "foto", "fotos"],
  ])("es %s: 1 is singular, everything else plural", (base, one, many) => {
    expect(plural(T.es, "es", base, ONE, 1)).toBe(`1 ${one}`);
    for (const n of [0, 2, 7, 20, 100, 1_000_000]) expect(plural(T.es, "es", base, ONE, n)).toBe(`${n} ${many}`);
  });

  it("technician offline bar and Today header wording (the strings the screens render)", () => {
    const t = T.ro;
    const bar = (waitingCount: number, attentionCount = 0, online = false) =>
      statusBarView({ online, syncState: "idle", waitingCount, attentionCount, lastSync: null, storageLow: false, clock: () => "", t, locale: "ro" } as never).text;
    expect(bar(1)).toBe("Offline · 1 modificare în așteptare");
    expect(bar(7)).toBe("Offline · 7 modificări în așteptare");
    expect(bar(19)).toBe("Offline · 19 modificări în așteptare");
    expect(bar(20)).toBe("Offline · 20 de modificări în așteptare");
    expect(bar(25)).toBe("Offline · 25 de modificări în așteptare");
    expect(bar(119)).toBe("Offline · 119 modificări în așteptare");
    expect(bar(120)).toBe("Offline · 120 de modificări în așteptare");
    const es2 = (n: number) => statusBarView({ online: false, syncState: "idle", waitingCount: n, attentionCount: 0, lastSync: null, storageLow: false, clock: () => "", t: T.es, locale: "es" } as never).text;
    expect(es2(1)).toContain("1 cambio");
    expect(es2(3)).toContain("3 cambios");
    const today = (n: number) => plural(t, "ro", "b2b.tech.today.jobCount", { one: "{n} job", other: "{n} jobs" }, n);
    expect([1, 2, 19, 20, 25].map(today)).toEqual(["1 lucrare", "2 lucrări", "19 lucrări", "20 de lucrări", "25 de lucrări"]);
  });
  it("the timer read out for screen readers uses the language's plural", () => {
    expect(timerSpeech(2 * 3600 + 5 * 60, { t: T.ro, locale: "ro" })).toBe("2 ore 5 minute");
    expect(timerSpeech(1 * 3600 + 1 * 60, { t: T.ro, locale: "ro" })).toBe("1 oră 1 minut");
    expect(timerSpeech(25 * 3600, { t: T.ro, locale: "ro" })).toBe("25 de ore");
    expect(timerSpeech(30, { t: T.ro, locale: "ro" })).toBe("mai puțin de un minut");
    expect(timerSpeech(3600 + 120, { t: T.es, locale: "es" })).toBe("1 hora 2 minutos");
    expect(timerSpeech(3 * 3600, {})).toBe("3 hours"); // no translator: English, as before
  });
});
