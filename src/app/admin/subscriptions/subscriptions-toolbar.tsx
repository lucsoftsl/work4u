"use client";

import { useCallback } from "react";
import { DebouncedSearchInput } from "@/components/admin/DebouncedSearchInput";
import { useTranslation } from "@/lib/i18n";
import type { PaymentStatus, SubscriptionPlan, SubscriptionSort, SubscriptionStatus } from "@/lib/admin-api";

export const SUBSCRIPTION_SORTS: readonly SubscriptionSort[] = [
    "updated_desc",
    "last_payment_desc",
    "renews_asc",
    "started_desc",
    "started_asc",
    "name_asc",
];
const PLANS: readonly SubscriptionPlan[] = ["free", "starter", "pro", "business"];
const STATUSES: readonly SubscriptionStatus[] = ["active", "trialing", "past_due", "canceled", "inactive"];
const PAYMENTS: readonly (PaymentStatus | "none")[] = ["succeeded", "failed", "action_required", "none"];

const SORT_FALLBACKS: Record<SubscriptionSort, string> = {
    updated_desc: "Recently updated",
    last_payment_desc: "Latest payment",
    renews_asc: "Renewing soonest",
    started_desc: "Newest subscribers",
    started_asc: "Oldest subscribers",
    name_asc: "Name A–Z",
};

export const PAYMENT_FALLBACKS: Record<PaymentStatus | "none", string> = {
    succeeded: "Paid",
    failed: "Failed",
    action_required: "Needs action",
    none: "No payments yet",
};

const CONTROL =
    "h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary";

export interface SubscriptionFilters {
    q: string;
    plan: string;
    status: string;
    payment: string;
    sort: SubscriptionSort;
}

interface SubscriptionsToolbarProps {
    filters: SubscriptionFilters;
    onChange: (patch: Partial<SubscriptionFilters>) => void;
}

export function SubscriptionsToolbar({ filters, onChange }: SubscriptionsToolbarProps) {
    const { t } = useTranslation();
    const commitSearch = useCallback((q: string) => onChange({ q }), [onChange]);

    return (
        <div role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
            <div className="sm:col-span-2 lg:col-span-1">
                <DebouncedSearchInput
                    id="admin-subscriptions-search"
                    label={t("adminSubscriptions.searchLabel", "Search subscriptions")}
                    placeholder={t("adminSubscriptions.searchPlaceholder", "Search by name, email, Stripe ID…")}
                    value={filters.q}
                    onCommit={commitSearch}
                    className={CONTROL}
                />
            </div>
            <select
                aria-label={t("adminSubscriptions.planFilter", "Plan")}
                value={filters.plan}
                onChange={(event) => onChange({ plan: event.target.value })}
                className={CONTROL}
            >
                <option value="">{t("adminSubscriptions.allPlans", "All plans")}</option>
                {PLANS.map((plan) => (
                    <option key={plan} value={plan}>
                        {plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </option>
                ))}
            </select>
            <select
                aria-label={t("adminSubscriptions.statusFilter", "Subscription status")}
                value={filters.status}
                onChange={(event) => onChange({ status: event.target.value })}
                className={CONTROL}
            >
                <option value="">{t("adminSubscriptions.allStatuses", "All statuses")}</option>
                {STATUSES.map((status) => (
                    <option key={status} value={status}>
                        {status.replace("_", " ")}
                    </option>
                ))}
            </select>
            <select
                aria-label={t("adminSubscriptions.paymentFilter", "Last payment")}
                value={filters.payment}
                onChange={(event) => onChange({ payment: event.target.value })}
                className={CONTROL}
            >
                <option value="">{t("adminSubscriptions.allPayments", "Any payment status")}</option>
                {PAYMENTS.map((payment) => (
                    <option key={payment} value={payment}>
                        {t(`adminSubscriptions.payment.${payment}`, PAYMENT_FALLBACKS[payment])}
                    </option>
                ))}
            </select>
            <select
                aria-label={t("adminSubscriptions.sortLabel", "Sort by")}
                value={filters.sort}
                onChange={(event) => onChange({ sort: event.target.value as SubscriptionSort })}
                className={CONTROL}
            >
                {SUBSCRIPTION_SORTS.map((sort) => (
                    <option key={sort} value={sort}>
                        {t(`adminSubscriptions.sort.${sort}`, SORT_FALLBACKS[sort])}
                    </option>
                ))}
            </select>
        </div>
    );
}
