import { describe, expect, it } from "vitest";
import { B2bError } from "@/b2b/api/client";
import {
  buildCreateJobInput, emptyDraft, firstInvalid, formatDuration, mapSubmitError, normalizeFieldKey, parseChecklist, parseDuration, validateDraft,
  type JobDraft,
} from "./job-form";

const valid = (o: Partial<JobDraft> = {}): JobDraft => ({ ...emptyDraft(), title: "Fix boiler", category: "Repair", customerId: "c1", locationId: "l1", ...o });

describe("validateDraft", () => {
  it("requires title, category, customer and location", () => {
    expect(validateDraft(emptyDraft())).toEqual({ title: "required", category: "required", customerId: "required", locationId: "required" });
    expect(validateDraft(valid())).toEqual({});
  });
  it("treats whitespace-only as empty and rejects over-long text", () => {
    expect(validateDraft(valid({ title: "   " })).title).toBe("required");
    expect(validateDraft(valid({ title: "x".repeat(201) })).title).toBe("tooLong");
  });
  it("checks the requested date and the duration", () => {
    expect(validateDraft(valid({ requestedDate: "2026-02-30" })).requestedDate).toBe("invalidDate");
    expect(validateDraft(valid({ requestedDate: "2026-10-12" })).requestedDate).toBeUndefined();
    expect(validateDraft(valid({ durationMin: "1.5" })).estimatedDurationMin).toBe("invalidNumber");
    expect(validateDraft(valid({ durationMin: "0" })).estimatedDurationMin).toBe("outOfRange");
    expect(validateDraft(valid({ durationMin: "999999" })).estimatedDurationMin).toBe("outOfRange");
    expect(validateDraft(valid({ durationMin: "" })).estimatedDurationMin).toBeUndefined();
  });
  it("limits checklist items", () => {
    expect(validateDraft(valid({ checklistText: Array.from({ length: 101 }, (_, i) => `i${i}`).join("\n") })).checklist).toBe("tooMany");
    expect(validateDraft(valid({ checklistText: "x".repeat(501) })).checklist).toBe("tooLong");
  });
  it("finds the first invalid field in display order", () => {
    expect(firstInvalid(validateDraft(emptyDraft()))).toBe("title");
    expect(firstInvalid({})).toBeNull();
  });
});

describe("buildCreateJobInput", () => {
  it("sends only what was filled in", () => {
    expect(buildCreateJobInput(valid())).toEqual({
      title: "Fix boiler", category: "Repair", customerId: "c1", locationId: "l1", priority: "NORMAL",
      requirements: { checklist: false, notes: false, photo: false, signature: false, review: false },
    });
  });
  it("trims, parses duration and splits the checklist (blank lines dropped)", () => {
    const body = buildCreateJobInput(valid({
      title: "  Fix  ", description: " details ", priority: "URGENT", requestedDate: "2026-10-20", durationMin: "90",
      requiredSkillIds: ["s1", "s2"], checklistText: "Turn off gas\n\n  Check valve  \r\nTest",
      requirements: { checklist: true, notes: false, photo: true, signature: false, review: true },
    }));
    expect(body).toMatchObject({
      title: "Fix", description: "details", priority: "URGENT", requestedDate: "2026-10-20", estimatedDurationMin: 90,
      requiredSkillIds: ["s1", "s2"], checklist: ["Turn off gas", "Check valve", "Test"],
      requirements: { checklist: true, photo: true, review: true },
    });
  });
  it("does not share the draft's arrays", () => {
    const d = valid({ requiredSkillIds: ["s1"] });
    const body = buildCreateJobInput(d);
    expect(body.requiredSkillIds).not.toBe(d.requiredSkillIds);
  });
});

describe("helpers", () => {
  it("parses checklist lines and durations", () => {
    expect(parseChecklist(" a \n\n b ")).toEqual(["a", "b"]);
    expect(parseDuration("45")).toBe(45);
    expect(parseDuration("4 5")).toBeNull();
  });
  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
  });
  it("maps nested server field paths onto form fields", () => {
    expect(normalizeFieldKey("checklist.3")).toBe("checklist");
    expect(normalizeFieldKey("requirements.photo")).toBe("requirements");
    expect(normalizeFieldKey("estimatedDurationMin")).toBe("estimatedDurationMin");
    expect(normalizeFieldKey("nope")).toBeNull();
  });
});

describe("mapSubmitError", () => {
  it("maps VALIDATION_ERROR fields to inline errors", () => {
    const e = new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { title: "Too small", "checklist.1": "Too long", _: "Bad body" } });
    expect(mapSubmitError(e)).toEqual({ kind: "field", fields: { title: "Too small", checklist: "Too long" }, message: undefined });
  });
  it("falls back to a banner when no field matches", () => {
    const e = new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { scheduledEnd: "must be after" } });
    expect(mapSubmitError(e)).toMatchObject({ kind: "field", fields: {}, message: "must be after" });
  });
  it("maps INVALID_REFERENCE to the named field or a banner", () => {
    expect(mapSubmitError(new B2bError(400, "INVALID_REFERENCE", "Unknown customerId/locationId", { field: "locationId" }))).toEqual({ kind: "field", fields: { locationId: "Unknown customerId/locationId" } });
    expect(mapSubmitError(new B2bError(400, "INVALID_REFERENCE", "Unknown", {}))).toMatchObject({ kind: "field", fields: {}, message: "Unknown" });
  });
  it("maps 403 and network failures", () => {
    expect(mapSubmitError(new B2bError(403, "FORBIDDEN", "no")).kind).toBe("forbidden");
    expect(mapSubmitError(new B2bError(0, "NETWORK", "offline")).kind).toBe("network");
    expect(mapSubmitError(new B2bError(500, "UNKNOWN", "boom"))).toMatchObject({ kind: "generic", message: "boom" });
  });
});
