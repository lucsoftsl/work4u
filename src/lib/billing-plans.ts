import { apiJson } from "@/lib/http";

export type PaidPlan = "starter" | "pro" | "business";
export type BillingInterval = "month" | "year";

export interface PlanAvailability {
  plan: PaidPlan;
  available: boolean;
  intervals: { month: boolean; year: boolean };
}

export interface PlansResponse {
  billingEnabled: boolean;
  plans: PlanAvailability[];
}

/** Everything unavailable: used when the plans call fails or returns junk. */
export const NO_BILLING: PlansResponse = { billingEnabled: false, plans: [] };

const PAID: readonly PaidPlan[] = ["starter", "pro", "business"];

/** Defensive parse; anything unexpected means "not available". */
export function normalizePlans(raw: unknown): PlansResponse {
  if (!raw || typeof raw !== "object") return NO_BILLING;
  const body = raw as { billingEnabled?: unknown; plans?: unknown };
  if (body.billingEnabled !== true || !Array.isArray(body.plans)) return NO_BILLING;
  const plans: PlanAvailability[] = [];
  for (const item of body.plans) {
    const entry = item as { plan?: unknown; available?: unknown; intervals?: { month?: unknown; year?: unknown } };
    if (!PAID.includes(entry?.plan as PaidPlan)) continue;
    plans.push({
      plan: entry.plan as PaidPlan,
      available: entry.available === true,
      intervals: { month: entry.intervals?.month === true, year: entry.intervals?.year === true },
    });
  }
  return { billingEnabled: true, plans };
}

export function isPlanAvailable(plans: PlansResponse, plan: PaidPlan, interval?: BillingInterval): boolean {
  if (!plans.billingEnabled) return false;
  const entry = plans.plans.find((p) => p.plan === plan);
  if (!entry || !entry.available) return false;
  return interval ? entry.intervals[interval] : true;
}

export function anyPlanAvailable(plans: PlansResponse): boolean {
  return plans.billingEnabled && plans.plans.some((p) => p.available);
}

/** Interval toggle is only useful when some available plan sells both intervals. */
export function showIntervalToggle(plans: PlansResponse, visible: readonly PaidPlan[]): boolean {
  return plans.billingEnabled && plans.plans.some((p) => visible.includes(p.plan) && p.available && p.intervals.month && p.intervals.year);
}

export async function fetchPlans(): Promise<PlansResponse> {
  try {
    return normalizePlans(await apiJson<unknown>("/api/subscriptions/plans", { cache: "no-store" }));
  } catch {
    return NO_BILLING;
  }
}

export const PAYMENTS_UNAVAILABLE_KEY = "pricing.paymentsUnavailable";

/**
 * Translation key for any checkout/portal failure. Server text is never shown; BILLING_UNAVAILABLE
 * and every other failure share the same friendly message.
 */
export function billingErrorKey(error: unknown): string {
  void error;
  return PAYMENTS_UNAVAILABLE_KEY;
}
