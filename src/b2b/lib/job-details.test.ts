import { describe, expect, it } from "vitest";
import { detailsFromJob, detailsPatch, validateDetails, type DetailsForm } from "./job-details";

const job = (o: Record<string, unknown> = {}) => ({ jobTypeId: "t1", price: 45000, cost: 29000, status: "SCHEDULED", ...o }) as never;
const OPT = { finance: true, locale: "en" };

describe("detailsFromJob", () => {
  it("fills the form from the job; money only for finance viewers", () => {
    expect(detailsFromJob(job(), OPT)).toEqual({ jobTypeId: "t1", price: "450.00", cost: "290.00" });
    expect(detailsFromJob(job(), { finance: false, locale: "en" })).toEqual({ jobTypeId: "t1", price: "", cost: "" });
    expect(detailsFromJob(job({ jobTypeId: null, price: undefined, cost: null }), OPT)).toEqual({ jobTypeId: "", price: "", cost: "" });
  });
});

describe("detailsPatch", () => {
  const base = (o: Partial<DetailsForm> = {}): DetailsForm => ({ jobTypeId: "t1", price: "450.00", cost: "290.00", ...o });
  it("sends nothing when nothing changed", () => {
    expect(detailsPatch(base(), job(), OPT)).toEqual({});
  });
  it("sends only what changed, money in minor units", () => {
    expect(detailsPatch(base({ price: "500,25" }), job(), { finance: true, locale: "ro" })).toEqual({ price: 50025 });
    expect(detailsPatch(base({ jobTypeId: "t2", cost: "300" }), job(), OPT)).toEqual({ jobTypeId: "t2", cost: 30000 });
  });
  it("clears with null: no type, or an emptied amount", () => {
    expect(detailsPatch(base({ jobTypeId: "", price: "" }), job(), OPT)).toEqual({ jobTypeId: null, price: null });
  });
  it("a viewer without finance.view can change the type but never sends money", () => {
    expect(detailsPatch(base({ jobTypeId: "t2", price: "1" }), job({ price: undefined, cost: undefined }), { finance: false, locale: "en" })).toEqual({ jobTypeId: "t2" });
  });
});

describe("validateDetails", () => {
  it("checks the amounts a finance viewer typed", () => {
    expect(validateDetails({ jobTypeId: "", price: "abc", cost: "10000000.01" }, OPT)).toEqual({ price: "invalidMoney", cost: "moneyRange" });
    expect(validateDetails({ jobTypeId: "", price: "abc", cost: "" }, { finance: false, locale: "en" })).toEqual({});
  });
});
