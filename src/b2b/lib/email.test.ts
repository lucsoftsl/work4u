import { describe, expect, it } from "vitest";
import { isValidEmail } from "./email";

// Same cases as the API's rule (zod 3 `.email()` in work4u-api); c769b0c5: the form accepted what the API refused.
describe("isValidEmail (mirrors the API)", () => {
  it.each(["ana@firma.ro", " ana@firma.ro ", "ana+1@x.ro", "o'neil@x.ie", "ana@sub.x.ro", "a@b.co", "ANA@FIRMA.RO"])("accepts %j", (v) => {
    expect(isValidEmail(v)).toBe(true);
  });
  it.each(["", "ana@firma", "a@b.c", "josé@x.es", "ana.pop@firmă.ro", "ana..pop@x.ro", ".ana@x.ro", "ana.@x.ro", "ana@-x.ro", "ana@x_y.ro", "ana@x.ro.", "ana@x.r0", "ana pop@x.ro", "ana@x.ro,"])("refuses %j", (v) => {
    expect(isValidEmail(v)).toBe(false);
  });
  it("refuses more than 255 characters", () => {
    expect(isValidEmail(`${"a".repeat(250)}@x.ro`)).toBe(true); // 255
    expect(isValidEmail(`${"a".repeat(251)}@x.ro`)).toBe(false);
  });
});
