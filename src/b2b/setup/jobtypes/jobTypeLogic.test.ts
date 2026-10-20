import { describe, expect, it } from "vitest";
import type { JobType } from "@/b2b/api/jobTypes";
import { applyOrder, filterTypes, isDuplicateName, jobTypeBody, moveType, normalizeName, validateJobTypeForm, type JobTypeForm } from "./jobTypeLogic";

const t = (id: string, name: string, extra: Partial<JobType> = {}): JobType => ({ id, name, position: 0, defaultDurationMin: null, archived: false, jobCount: 0, ...extra });
const LIST = [t("a", "Installation"), t("b", "Repair"), t("c", "Maintenance"), t("d", "Quote visit", { archived: true })];
const form = (o: Partial<JobTypeForm> = {}): JobTypeForm => ({ name: "Repair", durationMin: "", price: "", ...o });

describe("names", () => {
  it("collapses spaces and trims", () => {
    expect(normalizeName("  Emergency   call-out ")).toBe("Emergency call-out");
  });
  it("finds a duplicate in any case, ignoring the type being renamed", () => {
    expect(isDuplicateName(LIST, "  repair ", undefined)).toBe(true);
    expect(isDuplicateName(LIST, "REPAIR", "b")).toBe(false);
    expect(isDuplicateName(LIST, "Quote Visit", undefined)).toBe(true); // archived types still hold their name
    expect(isDuplicateName(LIST, "Inspection", undefined)).toBe(false);
  });
});

describe("validateJobTypeForm", () => {
  const ok = { finance: true, locale: "en" };
  it("needs a name of 1-100 characters", () => {
    expect(validateJobTypeForm(form({ name: "  " }), ok).name).toBe("required");
    expect(validateJobTypeForm(form({ name: "x".repeat(101) }), ok).name).toBe("tooLong");
    expect(validateJobTypeForm(form(), ok)).toEqual({});
  });
  it("default time is optional, a whole number of minutes up to 14 days", () => {
    expect(validateJobTypeForm(form({ durationMin: "90" }), ok)).toEqual({});
    expect(validateJobTypeForm(form({ durationMin: "1.5" }), ok).durationMin).toBe("invalid");
    expect(validateJobTypeForm(form({ durationMin: "0" }), ok).durationMin).toBe("range");
    expect(validateJobTypeForm(form({ durationMin: "20161" }), ok).durationMin).toBe("range");
  });
  it("default price is checked only for finance viewers", () => {
    expect(validateJobTypeForm(form({ price: "abc" }), ok).price).toBe("invalid");
    expect(validateJobTypeForm(form({ price: "10000000.01" }), ok).price).toBe("range");
    expect(validateJobTypeForm(form({ price: "abc" }), { finance: false, locale: "en" }).price).toBeUndefined();
  });
});

describe("jobTypeBody", () => {
  it("creates with trimmed name, minutes and minor-unit price (finance only)", () => {
    expect(jobTypeBody(form({ name: " Repair  visit ", durationMin: "90", price: "450,00" }), { finance: true, locale: "ro" })).toEqual({ name: "Repair visit", defaultDurationMin: 90, defaultPrice: 45000 });
    expect(jobTypeBody(form({ price: "450" }), { finance: false, locale: "en" })).toEqual({ name: "Repair" });
  });
  it("on rename sends only what changed; an emptied field is cleared with null", () => {
    const original = t("b", "Repair", { defaultDurationMin: 90, defaultPrice: 45000 });
    expect(jobTypeBody(form({ name: "Repair", durationMin: "90", price: "450.00" }), { finance: true, locale: "en" }, original)).toEqual({});
    expect(jobTypeBody(form({ name: "Repairs", durationMin: "", price: "450.00" }), { finance: true, locale: "en" }, original)).toEqual({ name: "Repairs", defaultDurationMin: null });
    expect(jobTypeBody(form({ name: "Repair", durationMin: "90", price: "" }), { finance: true, locale: "en" }, original)).toEqual({ defaultPrice: null });
  });
  it("a viewer without finance never touches the default price", () => {
    const original = t("b", "Repair", { defaultDurationMin: 90 });
    expect(jobTypeBody(form({ durationMin: "60" }), { finance: false, locale: "en" }, original)).toEqual({ defaultDurationMin: 60 });
  });
});

describe("moveType (the arrow buttons, and what a drop does)", () => {
  const active = LIST.filter((x) => !x.archived);
  it("moves one step up or down and reports the new position", () => {
    expect(moveType(active, "b", -1)).toEqual({ list: [active[1], active[0], active[2]], position: 1 });
    expect(moveType(active, "b", 1)).toEqual({ list: [active[0], active[2], active[1]], position: 3 });
  });
  it("does nothing at the ends", () => {
    expect(moveType(active, "a", -1)).toBeNull();
    expect(moveType(active, "c", 1)).toBeNull();
    expect(moveType(active, "zzz", 1)).toBeNull();
  });
  it("moves to an exact slot (drag and drop)", () => {
    expect(moveType(active, "c", 0, 0)?.list.map((x) => x.id)).toEqual(["c", "a", "b"]);
    expect(moveType(active, "a", 0, 2)?.list.map((x) => x.id)).toEqual(["b", "c", "a"]);
    expect(moveType(active, "a", 0, 0)).toBeNull();
  });
  it("never mutates its input", () => {
    const copy = [...active];
    moveType(active, "b", 1);
    expect(active).toEqual(copy);
  });
});

describe("applyOrder / filterTypes", () => {
  it("puts the given ids first and keeps every other type after them in its old order", () => {
    expect(applyOrder(LIST, ["c", "a"]).map((x) => x.id)).toEqual(["c", "a", "b", "d"]);
    expect(applyOrder(LIST, ["zzz"]).map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
  });
  it("filters Active / Archived / All", () => {
    expect(filterTypes(LIST, "active").map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(filterTypes(LIST, "archived").map((x) => x.id)).toEqual(["d"]);
    expect(filterTypes(LIST, "all")).toHaveLength(4);
  });
});

describe("job type price and currency", () => {
  const f = { name: "Repair", durationMin: "", price: "1500" };
  it("reads the price with the digits of the currency (JPY none, KWD three)", () => {
    expect(jobTypeBody(f, { finance: true, locale: "en", currency: "JPY" }).defaultPrice).toBe(1500);
    expect(jobTypeBody({ ...f, price: "12.345" }, { finance: true, locale: "en", currency: "KWD" }).defaultPrice).toBe(12345);
    expect(validateJobTypeForm({ ...f, price: "1500.5" }, { finance: true, locale: "en", currency: "JPY" }).price).toBe("invalid");
  });
  it("sends `currency` with the first price while the company has none", () => {
    expect(jobTypeBody(f, { finance: true, locale: "en", currency: "USD", chooseCurrency: "USD" })).toMatchObject({ defaultPrice: 150000, currency: "USD" });
    expect(jobTypeBody(f, { finance: true, locale: "en", currency: "USD" })).not.toHaveProperty("currency");
    expect(jobTypeBody({ ...f, price: "" }, { finance: true, locale: "en", currency: "USD", chooseCurrency: "USD" })).not.toHaveProperty("currency");
  });
  it("a patch carries it only when the price changes to an amount", () => {
    const original = { id: "t", name: "Repair", defaultPrice: null } as never;
    expect(jobTypeBody(f, { finance: true, locale: "en", currency: "USD", chooseCurrency: "USD" }, original)).toMatchObject({ defaultPrice: 150000, currency: "USD" });
    expect(jobTypeBody({ ...f, price: "" }, { finance: true, locale: "en", currency: "USD", chooseCurrency: "USD" }, { id: "t", name: "Repair", defaultPrice: 5 } as never)).not.toHaveProperty("currency");
  });
});
