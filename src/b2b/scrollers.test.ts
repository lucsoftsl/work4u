import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Structural guard (no browser needed): a horizontal scroller must be a containing block for absolutely positioned children. The `sr-only`
// utility is position:absolute; inside a scroller that is not positioned it escapes the clip and makes the WHOLE PAGE scroll sideways in
// Chromium and WebKit (found on /finance?view=table at 320/375).

const ROOTS = [path.join(__dirname), path.join(__dirname, "..", "components", "b2b-auth"), path.join(__dirname, "..", "components", "b2b-public"), path.join(__dirname, "..", "app", "(b2b)")];
const walk = (dir: string): string[] => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [path.join(dir, e.name)] : [])) : []);

describe("horizontal scrollers are positioned", () => {
  const offenders: string[] = [];
  let found = 0;
  for (const file of ROOTS.flatMap(walk)) {
    const src = fs.readFileSync(file, "utf8");
    // every string literal that carries an overflow-x-auto / overflow-auto utility
    for (const m of src.matchAll(/"([^"\n]*\boverflow-(?:x-)?(?:auto|scroll)\b[^"\n]*)"/g)) {
      found++;
      if (!/(^|\s)(relative|absolute|fixed|sticky)(\s|$)/.test(m[1])) offenders.push(`${path.relative(__dirname, file)}: "${m[1].slice(0, 80)}"`);
    }
  }
  it("finds the scrollers (so this guard cannot pass by finding nothing)", () => { expect(found).toBeGreaterThan(8); });
  it("every one has `relative` (or another positioning) on the same element", () => { expect(offenders).toEqual([]); });
});
