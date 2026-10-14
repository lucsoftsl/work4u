import type { AdminSubscriptionSummary, PaymentStatus, SubscriptionStatus } from "@/lib/admin-api";

/** Stripe amounts are in the currency's minor unit; Intl knows how many decimals each currency has. */
export function formatMinorAmount(amount: number, currency: string, locale: string): string {
    try {
        const format = new Intl.NumberFormat(locale, { style: "currency", currency });
        const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
        return format.format(amount / 10 ** digits);
    } catch {
        return `${(amount / 100).toFixed(2)} ${currency}`;
    }
}

export function formatDate(value: string | null, locale: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

export type BillingSource = "stripe" | "admin" | "none";

export function billingSource(sub: Pick<AdminSubscriptionSummary, "grantedByAdminId" | "stripeSubscriptionId">): BillingSource {
    if (sub.grantedByAdminId) return "admin";
    if (sub.stripeSubscriptionId) return "stripe";
    return "none";
}

export type RenewalKind = "renews" | "ends" | "until" | null;

/** What happens at the end of the current term, and when. */
export function renewal(
    sub: Pick<AdminSubscriptionSummary, "status" | "cancelAtPeriodEnd" | "currentPeriodEnd" | "activeTo">
): { kind: RenewalKind; date: string | null } {
    if (sub.currentPeriodEnd) {
        const ending = sub.cancelAtPeriodEnd || sub.status === "canceled";
        return { kind: ending ? "ends" : "renews", date: sub.currentPeriodEnd };
    }
    if (sub.activeTo) return { kind: "until", date: sub.activeTo };
    return { kind: null, date: null };
}

export const SUBSCRIPTION_STATUS_TONE: Record<SubscriptionStatus, string> = {
    active: "bg-success-soft text-success",
    trialing: "bg-info-soft text-info",
    past_due: "bg-danger-soft text-danger",
    canceled: "bg-sunken text-ink-muted",
    inactive: "bg-sunken text-ink-muted",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus | "none", string> = {
    succeeded: "bg-success-soft text-success",
    failed: "bg-danger-soft text-danger",
    action_required: "bg-warning-soft text-warning",
    none: "bg-sunken text-ink-muted",
};
