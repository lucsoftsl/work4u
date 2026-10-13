import { describe, expect, it } from "vitest";

import { planEntitlements } from "./plan-entitlements";

const sub = (plan: "free" | "starter" | "pro" | "business", status: "active" | "trialing" | "past_due" = "active") => ({
    plan,
    status,
    cancelAtPeriodEnd: false,
});

describe("planEntitlements", () => {
    it("uses the server's entitlements, so admin-edited limits apply", () => {
        const result = planEntitlements({
            ...sub("starter"),
            entitlements: { postLimit: 25, expiryDays: 45, boost: true, companyFeatures: false },
        });

        expect(result).toEqual({ postLimit: 25, expiryDays: 45, boost: true, companyFeatures: false, unlimitedPosts: false });
    });

    it("gives Starter its own limit instead of the free one", () => {
        expect(planEntitlements(sub("starter")).postLimit).toBe(10);
    });

    it("gives admins everything, including business features", () => {
        expect(planEntitlements({ ...sub("free"), status: "inactive", unlimited: true })).toMatchObject({
            unlimitedPosts: true,
            boost: true,
            companyFeatures: true,
        });
    });

    it("gives Business boost and unlimited posts, not only company features", () => {
        expect(planEntitlements(sub("business"))).toMatchObject({ unlimitedPosts: true, boost: true, companyFeatures: true });
    });

    it("treats trialing as active and lapsed subscriptions as free", () => {
        expect(planEntitlements(sub("pro", "trialing")).boost).toBe(true);
        expect(planEntitlements(sub("pro", "past_due")).postLimit).toBe(3);
    });

    it("falls back to free with no subscription", () => {
        expect(planEntitlements(null)).toMatchObject({ postLimit: 3, unlimitedPosts: false });
    });
});
