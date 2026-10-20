import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import en from "@/locales/en.json";

// `t(`b2b.x.${id}`, "English")` cannot be checked key by key. This guard at least proves that every such family exists in the
// dictionary: a prefix with no key at all (for example a table nobody added rows for) means the screen is English in every language.
const ROOT = path.resolve(__dirname, "..");
const TRANSLATE = /^(t|tr|trn|tx|plural|m|say)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.|\.d\.ts|testkit/.test(e.name)) out.push(p);
  }
  return out;
}

function families(file: string): Array<{ prefix: string; line: number }> {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: Array<{ prefix: string; line: number }> = [];
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && TRANSLATE.test(n.expression.getText(sf).split(".").pop() ?? "")) {
      const a = n.arguments[0];
      if (a && ts.isTemplateExpression(a) && a.head.text.startsWith("b2b.")) found.push({ prefix: a.head.text, line: sf.getLineAndCharacterOfPosition(a.getStart()).line + 1 });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

describe("computed locale keys", () => {
  const keys = Object.keys(en);
  it("every built key family has entries in the dictionary", () => {
    const missing = [path.join(ROOT, "b2b"), path.join(ROOT, "app/(b2b)"), path.join(ROOT, "components/b2b-auth")]
      .flatMap((d) => walk(d))
      .flatMap((f) => families(f).map((x) => ({ ...x, file: path.relative(ROOT, f) })))
      .filter((x) => !keys.some((k) => k.startsWith(x.prefix)))
      .map((x) => `${x.file}:${x.line} ${x.prefix}\${…}`);
    expect(missing, "add rows for these key families to en/ro/es").toEqual([]);
  });
});
