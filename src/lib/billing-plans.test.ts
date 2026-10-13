import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";
import {
  anyPlanAvailable,
  billingErrorKey,
  fetchPlans,
  isPlanAvailable,
  normalizePlans,
  NO_BILLING,
  showIntervalToggle,
} from "@/lib/billing-plans";

const on = {
  billingEnabled: true,
  plans: [
    { plan: "starter", available: false, intervals: { month: false, year: false } },
    { plan: "pro", available: true, intervals: { month: true, year: false } },
    { plan: "business", available: false, intervals: { month: false, year: false } },
  ],
};

describe("plans gating", () => {
  it("only reports available plans and intervals", () => {
    const p = normalizePlans(on);
    expect(isPlanAvailable(p, "pro")).toBe(true);
    expect(isPlanAvailable(p, "pro", "month")).toBe(true);
    expect(isPlanAvailable(p, "pro", "year")).toBe(false);
    expect(isPlanAvailable(p, "starter")).toBe(false);
    expect(anyPlanAvailable(p)).toBe(true);
  });
  it("hides the interval toggle unless a visible plan sells both", () => {
    expect(showIntervalToggle(normalizePlans(on), ["starter", "pro"])).toBe(false);
    const both = { ...on, plans: [{ plan: "pro", available: true, intervals: { month: true, year: true } }] };
    expect(showIntervalToggle(normalizePlans(both), ["starter", "pro"])).toBe(true);
  });
  it("treats billing off or junk as nothing available", () => {
    expect(normalizePlans({ ...on, billingEnabled: false })).toEqual(NO_BILLING);
    expect(normalizePlans(null)).toEqual(NO_BILLING);
    expect(normalizePlans("x")).toEqual(NO_BILLING);
    expect(anyPlanAvailable(NO_BILLING)).toBe(false);
  });
  it("fetchPlans resolves to unavailable when the call fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await fetchPlans()).toEqual(NO_BILLING);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    expect(await fetchPlans()).toEqual(NO_BILLING);
  });
});

describe("billingErrorKey", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("never exposes server text", () => {
    const err = new ApiError(503, "STRIPE_PRICE_PRO missing", "BILLING_UNAVAILABLE");
    expect(billingErrorKey(err)).toBe("pricing.paymentsUnavailable");
    expect(billingErrorKey(new Error("boom"))).toBe("pricing.paymentsUnavailable");
  });
});
