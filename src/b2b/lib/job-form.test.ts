import { describe, expect, it } from "vitest";
import { B2bError } from "@/b2b/api/client";
import {
  applyJobType, buildCreateJobInput, draftErrors, buildDraftBody, buildDraftPatch, draftFromJob, draftMissing, draftNeedsTitleOrClient, emptyDraft, firstInvalid,
  formatDuration, mapMissing, mapSubmitError, normalizeFieldKey, parseChecklist, parseDuration, validateDraft,
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
  it("maps CUSTOMER_ARCHIVED to its own kind (friendly message in the form)", () => {
    expect(mapSubmitError({ status: 409, code: "CUSTOMER_ARCHIVED", message: "raw" }).kind).toBe("archived");
  });
  it("maps VALIDATION_ERROR fields to inline errors", () => {
    const e = new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { title: "Too small", "checklist.1": "Too long", _: "Bad body" } });
    expect(mapSubmitError(e)).toEqual({ kind: "field", fields: { title: "Too small", checklist: "Too long" }, message: undefined, unknown: "Bad body" });
  });
  it("names a key the form has no input for, even when other fields are marked (c769b0c5)", () => {
    const e = new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { scheduledEnd: "must be after" } });
    expect(mapSubmitError(e)).toEqual({ kind: "field", fields: {}, message: undefined, unknown: "scheduledEnd: must be after" });
    const both = new B2bError(400, "VALIDATION_ERROR", "Invalid request", { fields: { title: "Too small", "slaDueAt": "Invalid datetime" } });
    expect(mapSubmitError(both)).toEqual({ kind: "field", fields: { title: "Too small" }, message: undefined, unknown: "slaDueAt: Invalid datetime" });
  });
  it("without field details the API's message is the banner", () => {
    expect(mapSubmitError(new B2bError(400, "VALIDATION_ERROR", "Invalid request", {}))).toEqual({ kind: "field", fields: {}, message: "Invalid request" });
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

const TYPES = { typesAvailable: true, finance: false } as const;
const MONEY = { typesAvailable: true, finance: true, locale: "en" } as const;

describe("job type instead of the free-text category (ce3173a7)", () => {
  it("with job types defined, a type is required (the category field is gone)", () => {
    expect(validateDraft(valid({ category: "" }), TYPES).jobTypeId).toBe("required");
    expect(validateDraft(valid({ category: "", jobTypeId: "t1" }), TYPES)).toEqual({});
  });
  it("without job types the category stays required, as before", () => {
    expect(validateDraft(valid({ category: "" })).category).toBe("required");
    expect(validateDraft(valid({ category: "" }), { typesAvailable: false }).jobTypeId).toBeUndefined();
  });
  it("sends jobTypeId and leaves the category out (the API copies the type's name into it)", () => {
    const body = buildCreateJobInput(valid({ category: "", jobTypeId: "t1" }), TYPES);
    expect(body.jobTypeId).toBe("t1");
    expect(body).not.toHaveProperty("category");
  });
  it("ignores an old typed category once types exist, and keeps it when they don't", () => {
    expect(buildCreateJobInput(valid({ category: "Repair", jobTypeId: "t1" }), TYPES)).not.toHaveProperty("category");
    expect(buildCreateJobInput(valid({ category: "Repair" }))).toHaveProperty("category", "Repair");
  });
});

describe("applyJobType: the type's duration and price prefill only what the user has not touched", () => {
  const type = { id: "t1", defaultDurationMin: 90, defaultPrice: 45000 };
  it("fills duration, and price for finance viewers, on an untouched form", () => {
    const d = applyJobType(emptyDraft(), type, MONEY);
    expect(d).toMatchObject({ jobTypeId: "t1", durationMin: "90", price: "450.00", durationTouched: false, priceTouched: false });
  });
  it("without finance.view no price is ever filled in", () => {
    expect(applyJobType(emptyDraft(), type, TYPES).price).toBe("");
  });
  it("does not overwrite what the user typed", () => {
    const d = applyJobType({ ...emptyDraft(), durationMin: "30", durationTouched: true, price: "10.00", priceTouched: true }, type, MONEY);
    expect(d).toMatchObject({ jobTypeId: "t1", durationMin: "30", price: "10.00" });
  });
  it("re-selecting the same type changes nothing, so edits survive", () => {
    const first = applyJobType(emptyDraft(), type, MONEY);
    const edited = { ...first, durationMin: "45", durationTouched: true };
    expect(applyJobType(edited, type, MONEY)).toBe(edited);
  });
  it("a type without defaults leaves the fields alone; choosing none clears only the id", () => {
    const d = applyJobType({ ...emptyDraft(), durationMin: "60" }, { id: "t2", defaultDurationMin: null, defaultPrice: null }, MONEY);
    expect(d).toMatchObject({ jobTypeId: "t2", durationMin: "60" });
    expect(applyJobType(d, null, MONEY).jobTypeId).toBe("");
  });
});

describe("money fields (aa659608)", () => {
  it("sends price and cost as integer minor units, only for finance viewers", () => {
    const d = valid({ jobTypeId: "t1", price: "450,50", cost: "290" });
    expect(buildCreateJobInput(d, { ...MONEY, locale: "ro" })).toMatchObject({ price: 45050, cost: 29000 });
    const none = buildCreateJobInput(d, TYPES);
    expect(none).not.toHaveProperty("price");
    expect(none).not.toHaveProperty("cost");
  });
  it("leaves empty money out; zero is a real amount", () => {
    expect(buildCreateJobInput(valid({ jobTypeId: "t1", price: "", cost: "0" }), MONEY)).toMatchObject({ cost: 0 });
    expect(buildCreateJobInput(valid({ jobTypeId: "t1", price: "" }), MONEY)).not.toHaveProperty("price");
  });
  it("validates the amounts", () => {
    expect(validateDraft(valid({ jobTypeId: "t1", price: "abc" }), MONEY).price).toBe("invalidMoney");
    expect(validateDraft(valid({ jobTypeId: "t1", cost: "10000000.01" }), MONEY).cost).toBe("moneyRange");
    expect(validateDraft(valid({ jobTypeId: "t1", price: "abc" }), TYPES).price).toBeUndefined(); // not visible, not checked
  });
});

describe("drafts (4718e5f9)", () => {
  it("a draft needs a title or a client", () => {
    expect(draftNeedsTitleOrClient(emptyDraft())).toBe(true);
    expect(draftNeedsTitleOrClient({ ...emptyDraft(), title: "  " })).toBe(true);
    expect(draftNeedsTitleOrClient({ ...emptyDraft(), title: "Leak" })).toBe(false);
    expect(draftNeedsTitleOrClient({ ...emptyDraft(), customerId: "c1" })).toBe(false);
  });
  it("a draft refuses only what cannot be sent: nothing is required, but bad formats still are", () => {
    expect(draftErrors({ ...emptyDraft(), title: "Leak" }, MONEY)).toEqual({});
    expect(draftErrors(emptyDraft(), MONEY)).toEqual({});
    expect(draftErrors({ ...emptyDraft(), title: "x".repeat(201), requestedDate: "2026-02-30", price: "abc" }, MONEY)).toEqual({ title: "tooLong", requestedDate: "invalidDate", price: "invalidMoney" });
  });
  it("builds a draft body: draft:true, only what was filled in, no location without its client", () => {
    expect(buildDraftBody({ ...emptyDraft(), title: " Leak " }, TYPES)).toMatchObject({ draft: true, title: "Leak" });
    const noClient = buildDraftBody({ ...emptyDraft(), title: "Leak", locationId: "l1" }, TYPES);
    expect(noClient).not.toHaveProperty("locationId");
    expect(noClient).not.toHaveProperty("customerId");
    expect(buildDraftBody({ ...emptyDraft(), customerId: "c1", locationId: "l1" }, TYPES)).toMatchObject({ draft: true, customerId: "c1", locationId: "l1" });
    expect(buildDraftBody({ ...emptyDraft(), title: "Leak" }, TYPES)).not.toHaveProperty("category");
  });
  it("validates nothing but the money a viewer can see", () => {
    expect(buildDraftBody({ ...emptyDraft(), title: "x", price: "12,5" }, { ...MONEY, locale: "ro" })).toMatchObject({ price: 1250 });
  });
  it("the PATCH body clears optional fields with null and sends a blank title as an empty string (accepted on a draft)", () => {
    const patch = buildDraftPatch({ ...emptyDraft(), title: "", customerId: "c1", description: "", jobTypeId: "", price: "", cost: "5" }, MONEY);
    expect(patch).toMatchObject({ title: "", customerId: "c1", description: null, jobTypeId: null, price: null, cost: 500, requestedDate: null, estimatedDurationMin: null });
    expect(patch).not.toHaveProperty("locationId");
  });
  it("lists what a draft still misses", () => {
    expect(draftMissing({ title: "", customerId: null, locationId: null, category: "", jobTypeId: null })).toEqual(["title", "customer", "location", "type"]);
    expect(draftMissing({ title: "Leak", customerId: "c", locationId: null, category: "", jobTypeId: "t" })).toEqual(["location"]);
    expect(draftMissing({ title: "Leak", customerId: "c", locationId: "l", category: "Repair", jobTypeId: null })).toEqual([]);
    expect(draftMissing({ title: "  ", customerId: "c", locationId: "l", category: "x", jobTypeId: null })).toEqual(["title"]);
  });
  it("maps the API's DRAFT_INCOMPLETE missing[] to the fields to highlight", () => {
    expect(mapMissing(["title", "customerId", "locationId", "category"], true)).toEqual(["title", "customerId", "locationId", "jobTypeId"]);
    expect(mapMissing(["category", "nope"], false)).toEqual(["category"]);
  });
  it("422 DRAFT_INCOMPLETE becomes an 'incomplete' error naming the fields; the friendly drafts errors have their own kinds", () => {
    const inc = new B2bError(422, "DRAFT_INCOMPLETE", "x", { missing: ["title", "locationId"] });
    expect(mapSubmitError(inc, TYPES)).toMatchObject({ kind: "incomplete", missing: ["title", "locationId"] });
    expect(mapSubmitError(new B2bError(409, "JOB_IS_DRAFT", "x")).kind).toBe("isDraft");
    expect(mapSubmitError(new B2bError(409, "NOT_A_DRAFT", "x")).kind).toBe("notDraft");
    expect(mapSubmitError(new B2bError(409, "JOB_TYPE_ARCHIVED", "x", { field: "jobTypeId" }))).toMatchObject({ kind: "archivedType" });
  });
  it("turns a draft from the server into form state (blank for missing client, location and money keys)", () => {
    const job = { title: "", category: "", description: null, customerId: null, locationId: null, priority: "HIGH", requestedDate: null, estimatedDurationMin: 90,
      requiredSkills: [{ id: "s1", name: "Gas" }], requirements: { checklist: false, notes: true, photo: false, signature: false, review: false },
      checklist: [{ id: "i", text: "Turn off gas", done: false }], jobTypeId: "t1", price: 45000, cost: undefined } as never;
    expect(draftFromJob(job, MONEY)).toMatchObject({
      title: "", customerId: "", locationId: "", priority: "HIGH", durationMin: "90", requiredSkillIds: ["s1"], checklistText: "Turn off gas",
      jobTypeId: "t1", price: "450.00", cost: "", durationTouched: true, priceTouched: true,
    });
    expect(draftFromJob(job, TYPES).price).toBe("");
  });
});

describe("currency of the first amount", () => {
  const money = (o: Partial<JobDraft> = {}) => valid({ price: "1500", cost: "", ...o });
  const FIN = { finance: true, locale: "en" } as const;

  it("amounts are read with the digits of the chosen currency (JPY has none, KWD has three)", () => {
    expect(buildCreateJobInput(money({ price: "1500" }), { ...FIN, currency: "JPY" }).price).toBe(1500);
    expect(buildCreateJobInput(money({ price: "12.345" }), { ...FIN, currency: "KWD" }).price).toBe(12345);
    expect(buildCreateJobInput(money({ price: "12.34" }), { ...FIN, currency: "EUR" }).price).toBe(1234);
    expect(draftErrors(money({ price: "1500.5" }), { ...FIN, currency: "JPY" }).price).toBe("invalidMoney");
    expect(draftErrors(money({ price: "12.3456" }), { ...FIN, currency: "KWD" }).price).toBe("invalidMoney");
  });
  it("sends `currency` with an amount only when the company has not chosen one yet", () => {
    expect(buildCreateJobInput(money(), { ...FIN, currency: "USD", chooseCurrency: "USD" }).currency).toBe("USD");
    expect(buildCreateJobInput(money(), { ...FIN, currency: "USD" })).not.toHaveProperty("currency");
  });
  it("no amount, no currency (the company currency is chosen by an amount or in the profile)", () => {
    expect(buildCreateJobInput(money({ price: "", cost: "" }), { ...FIN, currency: "USD", chooseCurrency: "USD" })).not.toHaveProperty("currency");
  });
  it("a viewer without finance.view never sends money or a currency", () => {
    const body = buildCreateJobInput(money(), { finance: false, chooseCurrency: "USD" });
    expect(body).not.toHaveProperty("price");
    expect(body).not.toHaveProperty("currency");
  });
  it("a draft patch carries the currency too", () => {
    expect(buildDraftPatch(money({ price: "20" }), { ...FIN, currency: "USD", chooseCurrency: "USD" }).currency).toBe("USD");
    expect(buildDraftPatch(money({ price: "" }), { ...FIN, currency: "USD", chooseCurrency: "USD" })).not.toHaveProperty("currency");
  });
  it("409 CURRENCY_REQUIRED: ask again, pre-selected with the suggestion; nothing was saved", () => {
    const e = mapSubmitError(new B2bError(409, "CURRENCY_REQUIRED", "x", { details: { effectiveCurrency: "GBP", preferredCurrency: "GBP" } }));
    expect(e).toMatchObject({ kind: "currencyRequired", suggestedCurrency: "GBP" });
    expect(mapSubmitError(new B2bError(409, "CURRENCY_REQUIRED", "x", {})).suggestedCurrency).toBeUndefined();
  });
  it("409 CURRENCY_MISMATCH: the page is out of date; says which currency the company has", () => {
    const e = mapSubmitError(new B2bError(409, "CURRENCY_MISMATCH", "x", { details: { currency: "RON" } }));
    expect(e).toMatchObject({ kind: "currencyMismatch", companyCurrency: "RON" });
  });
  it("a draft form opens an existing price with its currency's digits", () => {
    const d = draftFromJob({ id: "j", title: "t", price: 1500, cost: null } as never, { finance: true, locale: "en", currency: "JPY" });
    expect(d.price).toBe("1500");
  });
});
