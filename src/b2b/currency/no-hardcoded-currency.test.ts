import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// There is no default currency. A company has one only after it is chosen; the first-time default for a selector is EUR, and it lives
// in exactly one place (currency/fallback.ts). Any other currency code written into a string of the B2B code is a hard-coded currency.
const ROOT = path.resolve(__dirname, "../..");
const DIRS = [path.join(ROOT, "b2b"), path.join(ROOT, "app/(b2b)"), path.join(ROOT, "components/b2b-auth"), path.join(ROOT, "components/layout")];
// Codes that are also ordinary words or constants ("ALL" filter, "TRY") would flag harmless text.
const AMBIGUOUS = new Set(["ALL", "TOP", "TRY", "MOP", "PEN", "SOS", "BAM", "CUP", "BOB", "GEL", "KIP", "MAD", "NAD", "PAB", "SEK_"]);
const CODES = new Set((Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("currency").filter((c) => !AMBIGUOUS.has(c)));

/** Where a currency code may be written: the one fallback module (and tests/fixtures, which are not scanned). */
const ALLOWED_FILES = new Set(["b2b/currency/fallback.ts"]);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.|\.d\.ts|testkit|fixture/i.test(e.name)) out.push(p);
  }
  return out;
}

function hits(file: string): string[] {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  if (ALLOWED_FILES.has(rel)) return [];
  const sf = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: string[] = [];
  const check = (n: ts.Node, text: string) => {
    for (const word of text.match(/\b[A-Z]{3}\b/g) ?? []) {
      if (CODES.has(word)) found.push(`${rel}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1} "${word}"`);
    }
  };
  const visit = (n: ts.Node): void => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) check(n, n.text);
    else if (ts.isTemplateExpression(n)) check(n, n.head.text + n.templateSpans.map((s) => s.literal.text).join(" "));
    else if (ts.isJsxText(n)) check(n, n.getText(sf));
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

describe("no hard-coded currency in the B2B code", () => {
  it("no currency code is written into a string, a template or JSX text outside the fallback module", () => {
    const all = DIRS.flatMap((d) => walk(d)).flatMap(hits);
    if (process.env.DUMP_HITS) fs.writeFileSync(process.env.DUMP_HITS, all.join("\n"));
    expect(all, "use the company currency or useEffectiveCurrency(); the only EUR lives in currency/fallback.ts").toEqual([]);
  });
  it("the first-time default is EUR and nothing else", async () => {
    const { FIRST_TIME_CURRENCY } = await import("./fallback");
    expect(FIRST_TIME_CURRENCY).toBe("EUR");
  });
});

describe("the technician app never shows money", () => {
  it("nothing under the technician screens or the offline layer touches money, currency or prices", () => {
    const dirs = [path.join(ROOT, "b2b/components/tech"), path.join(ROOT, "app/(b2b)/tech"), path.join(ROOT, "b2b/offline")];
    const files = dirs.flatMap((d) => walk(d));
    expect(files.length).toBeGreaterThan(10);
    const offenders = files.filter((f) => /\b(useMoney|CurrencySelect|CurrencyChoice|formatMoney|formatAmount|useEffectiveCurrency|b2b\/lib\/money)\b|\b(price|defaultPrice|margin)\b\s*[:?]/.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
