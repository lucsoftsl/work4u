import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import es from "../locales/es.json";
import hu from "../locales/hu.json";
import ro from "../locales/ro.json";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) && !n.includes(".test.") ? [p] : [];
  });

const STR = String.raw`(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|\x60((?:\\.|[^\x60\\$])*)\x60)`;
const PAIR = new RegExp(String.raw`(["'])(b2b\.[A-Za-z0-9_.\-]+)\1\s*,\s*${STR}`, "gs");

const sources = ["src/b2b", "src/app/(b2b)/ops", "src/app/(b2b)/tech"].flatMap(walk);
const fallbacks = new Map<string, string>();
for (const file of sources) {
  for (const m of readFileSync(file, "utf8").matchAll(PAIR)) fallbacks.set(m[2], m[3] ?? m[4] ?? m[5]);
}
const b2bKeys = (d: Record<string, string>) => Object.keys(d).filter((k) => k.startsWith("b2b."));

describe("B2B locale keys", () => {
  const enDict = en as Record<string, string>;

  it("every t('b2b.…', fallback) has an en entry with the same text", () => {
    expect(fallbacks.size).toBeGreaterThan(100);
    const drift = [...fallbacks].filter(([k, v]) => enDict[k] !== v.replace(/\\(["'`])/g, "$1")).map(([k]) => k);
    expect(drift).toEqual([]);
  });

  for (const [name, dict] of Object.entries({ fr, es, hu, ro }) as Array<[string, Record<string, string>]>) {
    it(`${name} translates the evidence review copy`, () => {
      const untranslated = Object.keys(enDict).filter((k) => k.startsWith("b2b.review.evidence.") && dict[k] === enDict[k]);
      expect(untranslated).toEqual([]);
    });
    it(`${name} has every b2b key of en and keeps its {placeholders}`, () => {
      expect(b2bKeys(dict).sort()).toEqual(b2bKeys(enDict).sort());
      const broken = b2bKeys(enDict).filter((k) => {
        const want = (enDict[k].match(/\{\w+\}/g) ?? []).sort().join();
        return (dict[k].match(/\{\w+\}/g) ?? []).sort().join() !== want;
      });
      expect(broken).toEqual([]);
    });
  }
});
