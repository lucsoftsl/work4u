import { describe, expect, it } from "vitest";
import type { CompanySettings } from "./api";
import { isDirty, logoProblem, profilePatch, settingsToForm, validateProfile } from "./profile-form";

const base: CompanySettings = {
  id: "o1", name: "Costa Clima", legalName: "Costa Clima S.L.", taxId: null, phone: "+34600555021", addressLine: null, city: "Valencia", postalCode: null,
  country: "ES", timezone: "Europe/Madrid", locale: "es", logoUrl: null, createdAt: "2026-10-01", canEdit: true,
};

describe("company profile form", () => {
  it("maps settings to a form with empty strings for nulls", () => {
    const f = settingsToForm(base);
    expect(f.taxId).toBe("");
    expect(f.country).toBe("ES");
  });
  it("validates name, phone format, country code and lengths", () => {
    const f = settingsToForm(base);
    expect(validateProfile(f)).toEqual({});
    expect(validateProfile({ ...f, name: " " }).name).toBe("required");
    expect(validateProfile({ ...f, phone: "600 555 021", country: "" }).phone).toBe("phone"); // national number needs a country
    expect(validateProfile({ ...f, phone: "600 555 021" }).phone).toBeUndefined(); // ES is set
    expect(validateProfile({ ...f, phone: "12" }).phone).toBe("phone");
    expect(validateProfile({ ...f, phone: "+34 600 555 021" }).phone).toBeUndefined();
    expect(validateProfile({ ...f, country: "ESP" }).country).toBe("country");
    expect(validateProfile({ ...f, city: "x".repeat(101) }).city).toBe("tooLong");
  });
  it("sends only changed fields; emptied optional fields become null, required ones are never nulled", () => {
    const f = settingsToForm(base);
    expect(profilePatch(f, f)).toEqual({});
    expect(profilePatch(f, { ...f, city: "", taxId: "B123", phone: "+34 600 555 022", country: "es" })).toEqual({ city: null, taxId: "B123", phone: "+34600555022" });
    expect(profilePatch(f, { ...f, name: "  Costa  " })).toEqual({ name: "Costa" });
    expect(isDirty(f, { ...f, legalName: "" })).toBe(true);
    expect(isDirty(f, { ...f, name: "Costa Clima " })).toBe(false); // trailing spaces are not a change
  });
  it("refuses a bad logo before uploading: JPEG/PNG/WebP up to 2 MB, no SVG", () => {
    expect(logoProblem({ type: "image/png", size: 1000 })).toBeNull();
    expect(logoProblem({ type: "image/svg+xml", size: 10 })).toBe("type");
    expect(logoProblem({ type: "image/webp", size: 2 * 1024 * 1024 + 1 })).toBe("size");
  });
});
