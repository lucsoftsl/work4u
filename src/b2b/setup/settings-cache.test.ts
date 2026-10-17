import { describe, expect, it } from "vitest";
import type { CompanySettings } from "./api";
import { mergeSettings } from "./settings-cache";

const base: CompanySettings = { id: "o", name: "A", legalName: null, taxId: null, phone: null, addressLine: null, city: null, postalCode: null, country: "ES", timezone: "UTC", locale: null, logoUrl: null, createdAt: "x", canEdit: true };

describe("mergeSettings (regression: the page flipped to 'View only' after a logo upload)", () => {
  it("keeps canEdit when the write response omits it", () => {
    const { canEdit: _omit, ...withoutCanEdit } = { ...base, logoUrl: "https://x/logo" };
    void _omit;
    const merged = mergeSettings(base, withoutCanEdit as CompanySettings, false);
    expect(merged.canEdit).toBe(true);
    expect(merged.logoUrl).toBe("https://x/logo");
  });
  it("falls back to the viewer's role when nothing is cached", () => {
    const { canEdit: _omit, ...rest } = base;
    void _omit;
    expect(mergeSettings(undefined, rest as CompanySettings, true).canEdit).toBe(true);
    expect(mergeSettings(undefined, rest as CompanySettings, false).canEdit).toBe(false);
  });
  it("uses the response value when the API sends it", () => {
    expect(mergeSettings(base, { ...base, canEdit: false }, true).canEdit).toBe(false);
  });
});
