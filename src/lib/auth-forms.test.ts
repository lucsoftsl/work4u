import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A form submitted before hydration falls back to a native GET and puts ?email=&password= in the URL
// (history, Referer, access logs). Every auth form must therefore declare method="post".
describe("auth forms never fall back to GET", () => {
  for (const file of ["src/components/SignIn.tsx", "src/app/(app)/signup/page.tsx"]) {
    it(`${file}: every <form> has method="post"`, () => {
      const forms = readFileSync(file, "utf8").match(/<form\b[^>]*>/g) ?? [];
      expect(forms.length).toBeGreaterThan(0);
      for (const tag of forms) expect(tag).toContain('method="post"');
    });
  }
});
