import { describe, expect, it } from "vitest";
import { B2bError } from "@/b2b/api/client";
import { splitApiFieldErrors } from "./apiFieldErrors";

const KNOWN = ["displayName", "workEmail", "phone", "roleId"] as const;

describe("splitApiFieldErrors", () => {
  it("maps every fields key of a VALIDATION_ERROR to the form (c769b0c5)", () => {
    const err = new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { workEmail: "Invalid email", phone: "Use international format" } });
    expect(splitApiFieldErrors(err, KNOWN)).toEqual({ fields: { workEmail: "Invalid email", phone: "Use international format" }, unknown: [] });
  });
  it("reduces array/object paths to the field and applies aliases", () => {
    const err = new B2bError(400, "VALIDATION_ERROR", "x", { fields: { "roleTemplate": "Invalid enum", "teamIds.0": "Invalid uuid" } });
    const out = splitApiFieldErrors(err, KNOWN, { roleTemplate: "roleId" });
    expect(out.fields).toEqual({ roleId: "Invalid enum" });
    expect(out.unknown).toEqual([{ key: "teamIds", message: "Invalid uuid" }]);
  });
  it("keeps the first message per field", () => {
    const err = new B2bError(400, "VALIDATION_ERROR", "x", { fields: { "phone": "first", "phone.0": "second" } });
    expect(splitApiFieldErrors(err, KNOWN).fields).toEqual({ phone: "first" });
  });
  it("uses body.field of other 400/409 shapes (duplicates, invalid references)", () => {
    const dup = new B2bError(409, "DUPLICATE_MEMBER", "Another member has this email", { field: "email" });
    expect(splitApiFieldErrors(dup, KNOWN, { email: "workEmail" }).fields).toEqual({ workEmail: "Another member has this email" });
    const ref = new B2bError(400, "INVALID_REFERENCE", "Unknown role", { field: "roleId" });
    expect(splitApiFieldErrors(ref, KNOWN).fields).toEqual({ roleId: "Unknown role" });
  });
  it("ignores the form-level '_' key and non-string messages, and anything that isn't a 4xx with fields", () => {
    expect(splitApiFieldErrors(new B2bError(400, "VALIDATION_ERROR", "x", { fields: { _: "Give roleId or roleTemplate", phone: 3 } }), KNOWN)).toEqual({ fields: {}, unknown: [] });
    expect(splitApiFieldErrors(new B2bError(500, "INTERNAL" as never, "x", { fields: { phone: "y" } }), KNOWN)).toEqual({ fields: {}, unknown: [] });
    expect(splitApiFieldErrors(new Error("boom"), KNOWN)).toEqual({ fields: {}, unknown: [] });
  });
});
