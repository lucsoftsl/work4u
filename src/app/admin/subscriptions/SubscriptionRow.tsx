"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { fetchUserPayments, type AdminPayment, type AdminSubscriptionSummary } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import {
    billingSource,
    formatDate,
    formatMinorAmount,
    PAYMENT_STATUS_TONE,
    renewal,
    SUBSCRIPTION_STATUS_TONE,
} from "./format";
import { PAYMENT_FALLBACKS } from "./subscriptions-toolbar";

const CHIP = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold";

const SOURCE_FALLBACKS = { stripe: "Stripe", admin: "Admin grant", none: "No billing" } as const;
const INTERVAL_FALLBACKS = { month: "Monthly", year: "Yearly" } as const;
const RENEWAL_FALLBACKS = { renews: "Renews {date}", ends: "Ends {date}", until: "Until {date}" } as const;

type HistoryState = { kind: "closed" } | { kind: "loading" } | { kind: "error" } | { kind: "loaded"; payments: AdminPayment[] };

interface SubscriptionRowProps {
    sub: AdminSubscriptionSummary;
    token: string;
}

/** One subscriber: plan, status, billing source, renewal and latest payment; expands to the full payment history. */
export function SubscriptionRow({ sub, token }: SubscriptionRowProps) {
    const { t, locale } = useTranslation();
    const [history, setHistory] = useState<HistoryState>({ kind: "closed" });
    const panelId = `payments-${sub.userId}`;
    const isOpen = history.kind !== "closed";

    const source = billingSource(sub);
    const term = renewal(sub);
    const termDate = formatDate(term.date, locale);
    const lastPayment = sub.lastPaymentStatus ?? "none";

    const toggle = async () => {
        if (isOpen) {
            setHistory({ kind: "closed" });
            return;
        }
        setHistory({ kind: "loading" });
        try {
            setHistory({ kind: "loaded", payments: await fetchUserPayments(sub.userId, token) });
        } catch (error) {
            console.error("Failed to load payments:", error);
            setHistory({ kind: "error" });
        }
    };

    return (
        <li className="bg-canvas">
            <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-center">
                <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{sub.displayName || sub.email}</p>
                    <p className="truncate text-sm text-ink-muted">{sub.email}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(CHIP, "bg-primary-soft text-primary-strong capitalize")}>{sub.plan}</span>
                    <span className={cn(CHIP, SUBSCRIPTION_STATUS_TONE[sub.status])}>{sub.status.replace("_", " ")}</span>
                    <p className="w-full text-xs text-ink-muted" title={sub.grantReason ?? undefined}>
                        {t(`adminSubscriptions.source.${source}`, SOURCE_FALLBACKS[source])}
                        {sub.billingInterval
                            ? ` · ${t(`adminSubscriptions.interval.${sub.billingInterval}`, INTERVAL_FALLBACKS[sub.billingInterval])}`
                            : ""}
                        {term.kind && termDate
                            ? ` · ${t(`adminSubscriptions.term.${term.kind}`, RENEWAL_FALLBACKS[term.kind]).replace("{date}", termDate)}`
                            : ""}
                    </p>
                </div>

                <div className="min-w-0 text-sm">
                    <span className={cn(CHIP, PAYMENT_STATUS_TONE[lastPayment])}>
                        {t(`adminSubscriptions.payment.${lastPayment}`, PAYMENT_FALLBACKS[lastPayment])}
                    </span>
                    {sub.lastPaymentAmount !== null && sub.lastPaymentCurrency ? (
                        <span className="ml-2 tabular text-ink">
                            {formatMinorAmount(sub.lastPaymentAmount, sub.lastPaymentCurrency, locale)}
                        </span>
                    ) : null}
                    {sub.lastPaymentAt ? <span className="ml-2 text-ink-muted">{formatDate(sub.lastPaymentAt, locale)}</span> : null}
                    {sub.lastPaymentFailureReason ? (
                        <p className="mt-1 truncate text-xs text-danger" title={sub.lastPaymentFailureReason}>
                            {sub.lastPaymentFailureReason}
                        </p>
                    ) : null}
                    {sub.lastPaymentStatus !== "succeeded" && sub.lastPaymentNextAttempt ? (
                        <p className="mt-1 text-xs text-ink-muted">
                            {t("adminSubscriptions.nextRetry", "Stripe retries {date}").replace(
                                "{date}",
                                formatDate(sub.lastPaymentNextAttempt, locale) ?? ""
                            )}
                        </p>
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="inline-flex items-center gap-1 justify-self-start rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken md:justify-self-end"
                >
                    {t("adminSubscriptions.history", "Payments")}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                </button>
            </div>

            {isOpen ? (
                <div id={panelId} className="border-t border-line bg-surface px-4 py-3">
                    <PaymentHistory state={history} />
                </div>
            ) : null}
        </li>
    );
}

function PaymentHistory({ state }: { state: HistoryState }) {
    const { t, locale } = useTranslation();

    if (state.kind === "loading") return <p className="text-sm text-ink-muted">{t("adminSubscriptions.historyLoading", "Loading payments…")}</p>;
    if (state.kind === "error") return <p className="text-sm text-danger">{t("adminSubscriptions.historyError", "Could not load payments.")}</p>;
    if (state.kind !== "loaded") return null;
    if (state.payments.length === 0) {
        return <p className="text-sm text-ink-muted">{t("adminSubscriptions.historyEmpty", "No payments recorded for this user yet.")}</p>;
    }

    return (
        <table className="w-full text-left text-sm">
            <thead className="text-xs text-ink-muted">
                <tr>
                    <th scope="col" className="py-1.5 pr-3 font-medium">{t("adminSubscriptions.col.date", "Date")}</th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">{t("adminSubscriptions.col.status", "Status")}</th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">{t("adminSubscriptions.col.amount", "Amount")}</th>
                    <th scope="col" className="py-1.5 pr-3 font-medium max-sm:hidden">{t("adminSubscriptions.col.period", "Period")}</th>
                    <th scope="col" className="py-1.5 font-medium max-sm:hidden">{t("adminSubscriptions.col.details", "Details")}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-line">
                {state.payments.map((payment) => (
                    <tr key={payment.id}>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDate(payment.paidAt ?? payment.dateTimeCreated, locale)}</td>
                        <td className="py-2 pr-3">
                            <span className={cn(CHIP, PAYMENT_STATUS_TONE[payment.status])}>
                                {t(`adminSubscriptions.payment.${payment.status}`, PAYMENT_FALLBACKS[payment.status])}
                            </span>
                        </td>
                        <td className="py-2 pr-3 tabular whitespace-nowrap">{formatMinorAmount(payment.amount, payment.currency, locale)}</td>
                        <td className="py-2 pr-3 text-ink-muted max-sm:hidden">
                            {[formatDate(payment.periodStart, locale), formatDate(payment.periodEnd, locale)].filter(Boolean).join(" – ")}
                        </td>
                        <td className="py-2 text-ink-muted max-sm:hidden">
                            {payment.failureReason ? <span className="text-danger">{payment.failureReason} · </span> : null}
                            {payment.attemptCount > 1
                                ? t("adminSubscriptions.attempts", "{count} attempts").replace("{count}", String(payment.attemptCount))
                                : null}
                            {payment.hostedInvoiceUrl ? (
                                <a
                                    href={payment.hostedInvoiceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                                >
                                    {t("adminSubscriptions.invoice", "Invoice")}
                                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                            ) : null}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
