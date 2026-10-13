"use client";

import { useEffect, useState } from "react";
import { getPlanLimits, type Plan, type PlanLimits, type SubscriptionStatus } from "@/api/subscriptions";

export interface PlanEntitlements extends PlanLimits {
    /** postLimit is null: no cap on active posts. */
    unlimitedPosts: boolean;
}

/**
 * Built-in defaults, matching the server's seed values. Only used until the
 * server's numbers arrive (or if it can't be reached); admins edit the real
 * values at /admin/plans.
 */
export const DEFAULT_PLAN_LIMITS: Record<Plan, PlanLimits> = {
    free: { postLimit: 3, expiryDays: 14, boost: false, companyFeatures: false },
    starter: { postLimit: 10, expiryDays: 30, boost: false, companyFeatures: false },
    pro: { postLimit: null, expiryDays: 90, boost: true, companyFeatures: false },
    business: { postLimit: null, expiryDays: 90, boost: true, companyFeatures: true },
};

const EVERYTHING: PlanLimits = { postLimit: null, expiryDays: 90, boost: true, companyFeatures: true };

function withFlags(limits: PlanLimits): PlanEntitlements {
    return { ...limits, unlimitedPosts: limits.postLimit === null };
}

/**
 * What the user may use right now. Prefers the server's `entitlements` (it accounts for admin
 * edits, lapsed subscriptions and grant windows); the fallbacks only cover older API responses.
 */
export function planEntitlements(sub: SubscriptionStatus | null | undefined): PlanEntitlements {
    if (!sub) return withFlags(DEFAULT_PLAN_LIMITS.free);
    if (sub.entitlements) return withFlags(sub.entitlements);
    if (sub.unlimited) return withFlags(EVERYTHING);
    if (sub.status !== "active" && sub.status !== "trialing") return withFlags(DEFAULT_PLAN_LIMITS.free);
    return withFlags(DEFAULT_PLAN_LIMITS[sub.plan] ?? DEFAULT_PLAN_LIMITS.free);
}

/** Every plan's limits from the server, starting from the defaults so pages render immediately. */
export function usePlanLimits(): Record<Plan, PlanLimits> {
    const [limits, setLimits] = useState<Record<Plan, PlanLimits>>(DEFAULT_PLAN_LIMITS);

    useEffect(() => {
        let isActive = true;
        getPlanLimits()
            .then((rows) => {
                if (!isActive) return;
                setLimits((prev) => {
                    const next = { ...prev };
                    for (const { plan, ...planLimits } of rows) {
                        if (plan in next) next[plan] = planLimits;
                    }
                    return next;
                });
            })
            .catch((error) => console.error("Failed to load plan limits, showing defaults:", error));
        return () => {
            isActive = false;
        };
    }, []);

    return limits;
}
