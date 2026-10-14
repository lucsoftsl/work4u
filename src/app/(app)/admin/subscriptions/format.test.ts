import { describe, expect, it } from "vitest";

import { billingSource, formatMinorAmount, renewal } from "./format";

describe("formatMinorAmount", () => {
    it("converts minor units using the currency's own decimals", () => {
        expect(formatMinorAmount(1900, "EUR", "en")).toBe("€19.00");
        expect(formatMinorAmount(1900, "JPY", "en")).toBe("¥1,900");
    });

    it("falls back to a plain amount for an unknown currency", () => {
        expect(formatMinorAmount(1900, "NOPE1", "en")).toBe("19.00 NOPE1");
    });
});

describe("billingSource", () => {
    it("prefers an admin grant over a Stripe id", () => {
        expect(billingSource({ grantedByAdminId: "admin_1", stripeSubscriptionId: "sub_1" })).toBe("admin");
        expect(billingSource({ grantedByAdminId: null, stripeSubscriptionId: "sub_1" })).toBe("stripe");
        expect(billingSource({ grantedByAdminId: null, stripeSubscriptionId: null })).toBe("none");
    });
});

describe("renewal", () => {
    const base = { status: "active" as const, cancelAtPeriodEnd: false, currentPeriodEnd: null, activeTo: null };

    it("renews at period end unless cancelled", () => {
        expect(renewal({ ...base, currentPeriodEnd: "2026-11-01" })).toEqual({ kind: "renews", date: "2026-11-01" });
        expect(renewal({ ...base, currentPeriodEnd: "2026-11-01", cancelAtPeriodEnd: true }).kind).toBe("ends");
    });

    it("shows the end of an admin grant window", () => {
        expect(renewal({ ...base, activeTo: "2026-12-31" })).toEqual({ kind: "until", date: "2026-12-31" });
    });

    it("has nothing to show for open-ended free rows", () => {
        expect(renewal(base)).toEqual({ kind: null, date: null });
    });
});
