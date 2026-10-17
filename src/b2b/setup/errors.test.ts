import { describe, expect, it } from "vitest";
import { B2bError } from "@/b2b/api/client";
import { clientFieldErrors, duplicateField, setupErrorMessage } from "./errors";

const tr = (_k: string, f: string, v?: Record<string, string | number>) => Object.entries(v ?? {}).reduce((s, [k, x]) => s.split(`{${k}}`).join(String(x)), f);

describe("client save errors", () => {
  it("a duplicate Client ID is shown under the Client ID field", () => {
    expect(clientFieldErrors(new B2bError(409, "DUPLICATE_EXTERNAL_ID", "x", { field: "externalId" }), tr)).toEqual({ externalId: "Another client already has this Client ID." });
  });
  it("API field errors map to their own fields", () => {
    const e = new B2bError(400, "VALIDATION_ERROR", "x", { fields: { phone: "Enter a valid phone number", externalId: "bad" } });
    expect(Object.keys(clientFieldErrors(e, tr)).sort()).toEqual(["externalId", "phone"]);
  });
  it("other failures have no field errors", () => {
    expect(clientFieldErrors(new B2bError(500, "UNKNOWN", "x"), tr)).toEqual({});
    expect(clientFieldErrors(new Error("x"), tr)).toEqual({});
  });
});

describe("member and setup errors", () => {
  it("names the duplicate field and maps it to the form field", () => {
    const e = new B2bError(409, "DUPLICATE_MEMBER", "x", { field: "phone" });
    expect(setupErrorMessage(e, tr)).toBe("Another person already has this phone number.");
    expect(duplicateField(e)).toBe("phone");
  });
  it("never shows codes or status numbers", () => {
    for (const e of [new B2bError(403, "FORBIDDEN", "x"), new B2bError(404, "NOT_FOUND", "x"), new B2bError(500, "UNKNOWN", "x"), new B2bError(0, "NETWORK", "x")]) expect(setupErrorMessage(e, tr)).not.toMatch(/\b(403|404|500|FORBIDDEN|NOT_FOUND)\b/);
  });
});
