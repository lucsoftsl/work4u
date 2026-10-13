import { describe, expect, it } from "vitest";
import { draftChanged, fromDraft, summarizeHours, toDraft, validateDraft } from "./working-hours";

describe("working hours", () => {
  it("starts from Mon-Fri 09-17 when the team has no hours", () => {
    const d = toDraft(null);
    expect(d.mon).toEqual({ on: true, start: "09:00", end: "17:00" });
    expect(d.sat.on).toBe(false);
  });
  it("round-trips API hours; absent days are off and sent as null", () => {
    const api = { mon: { start: "08:00", end: "16:00" }, tue: { start: "08:00", end: "16:00" } };
    const body = fromDraft(toDraft(api));
    expect(body.mon).toEqual({ start: "08:00", end: "16:00" });
    expect(body.wed).toBeNull();
    expect(body.sun).toBeNull();
  });
  it("validates times and ordering only for days that are on", () => {
    const d = toDraft(null);
    d.tue = { on: true, start: "17:00", end: "09:00" };
    d.wed = { on: true, start: "", end: "10:00" };
    d.thu = { on: false, start: "17:00", end: "09:00" };
    expect(Object.keys(validateDraft(d)).sort()).toEqual(["tue", "wed"]);
  });
  it("detects changes against the original", () => {
    const a = toDraft(null);
    expect(draftChanged(a, toDraft(null))).toBe(false);
    expect(draftChanged(a, { ...a, fri: { ...a.fri, end: "15:00" } })).toBe(true);
  });
  it("summarises consecutive days with equal hours", () => {
    expect(summarizeHours(null)).toBeNull();
    expect(summarizeHours({ mon: { start: "08:00", end: "16:00" }, tue: { start: "08:00", end: "16:00" }, wed: { start: "08:00", end: "16:00" }, sat: { start: "09:00", end: "12:00" } }))
      .toBe("Mon–Wed 08:00–16:00, Sat 09:00–12:00");
    expect(summarizeHours({ mon: { start: "08:00", end: "16:00" }, wed: { start: "08:00", end: "16:00" } })).toBe("Mon 08:00–16:00, Wed 08:00–16:00");
    expect(summarizeHours({})).toBe("");
  });
});
