"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { scrollToListStart } from "@/lib/scroll";
import { Button } from "@/components/ui/Button";
import {
    fetchSubscriptions,
    type AdminSubscriptionListParams,
    type AdminSubscriptionSummary,
    type SubscriptionSort,
} from "@/lib/admin-api";
import { SUBSCRIPTION_SORTS, SubscriptionsToolbar, type SubscriptionFilters } from "./subscriptions-toolbar";
import { SubscriptionRow } from "./SubscriptionRow";

const PAGE_SIZE = 25;
const DEFAULT_SORT: SubscriptionSort = "updated_desc";

// Search, filters, sort and page live in the URL so a filtered view survives reloads and can be shared.
function readFilters(params: URLSearchParams): SubscriptionFilters & { page: number } {
    const sort = params.get("sort") as SubscriptionSort | null;
    const page = Number(params.get("page"));
    return {
        q: params.get("q") ?? "",
        plan: params.get("plan") ?? "",
        status: params.get("status") ?? "",
        payment: params.get("payment") ?? "",
        sort: sort && SUBSCRIPTION_SORTS.includes(sort) ? sort : DEFAULT_SORT,
        page: Number.isInteger(page) && page > 0 ? page : 1,
    };
}

export default function AdminSubscriptionsPage() {
    return (
        <Suspense fallback={null}>
            <AdminSubscriptionsContent />
        </Suspense>
    );
}

function AdminSubscriptionsContent() {
    const { t } = useTranslation();
    const { user, firebaseToken } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const filters = useMemo(() => readFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
    const listRef = useRef<HTMLElement>(null);
    const summaryRef = useRef<HTMLParagraphElement>(null);

    const [subs, setSubs] = useState<AdminSubscriptionSummary[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!firebaseToken || user?.userType !== "ADMIN") return;

        let isActive = true;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchSubscriptions(firebaseToken, {
                    q: filters.q,
                    plan: (filters.plan || undefined) as AdminSubscriptionListParams["plan"],
                    status: (filters.status || undefined) as AdminSubscriptionListParams["status"],
                    payment: (filters.payment || undefined) as AdminSubscriptionListParams["payment"],
                    sort: filters.sort,
                    limit: PAGE_SIZE,
                    offset: (filters.page - 1) * PAGE_SIZE,
                });
                if (!isActive) return;
                setSubs(data.items);
                setTotal(data.total);
            } catch (err) {
                console.error("Failed to load subscriptions:", err);
                if (isActive) setError(t("adminSubscriptions.loadError", "Failed to load subscriptions."));
            } finally {
                if (isActive) setLoading(false);
            }
        };

        void load();
        return () => {
            isActive = false;
        };
    }, [firebaseToken, user?.userType, t, filters]);

    const updateFilters = useCallback(
        (patch: Partial<SubscriptionFilters> & { page?: number }) => {
            const next = new URLSearchParams(searchParams.toString());
            for (const [key, value] of Object.entries(patch)) {
                const isDefault = value === "" || (key === "sort" && value === DEFAULT_SORT) || (key === "page" && value === 1);
                if (isDefault) next.delete(key);
                else next.set(key, String(value));
            }
            // Any change other than paging starts again from the first page.
            if (!("page" in patch)) next.delete("page");
            const qs = next.toString();
            router.replace(qs ? `/admin/subscriptions?${qs}` : "/admin/subscriptions", { scroll: false });
        },
        [router, searchParams]
    );

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const firstShown = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
    const lastShown = Math.min(filters.page * PAGE_SIZE, total);
    const hasFilters = Boolean(filters.q || filters.plan || filters.status || filters.payment);

    const goToPage = (page: number) => {
        updateFilters({ page });
        scrollToListStart(listRef.current, summaryRef.current);
    };

    if (user?.userType !== "ADMIN" || !firebaseToken) {
        return null;
    }

    return (
        <div className="min-h-screen bg-surface">
            <div className="max-w-6xl mx-auto px-4 py-16">
                <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    <ArrowLeft className="w-4 h-4" />
                    {t("admin.backToDashboard")}
                </Link>
                <h1 className="mt-4 text-4xl font-bold text-ink mb-2">{t("adminSubscriptions.title", "Subscriptions")}</h1>
                <p className="text-ink-muted mb-8">
                    {t("adminSubscriptions.subtitle", "See who is on which plan and whether their payments went through.")}
                </p>

                <SubscriptionsToolbar filters={filters} onChange={updateFilters} />

                <section ref={listRef} aria-labelledby="admin-subscriptions-summary" className="mt-6 scroll-mt-[calc(var(--header-h)+1rem)]">
                    <p
                        ref={summaryRef}
                        id="admin-subscriptions-summary"
                        tabIndex={-1}
                        aria-live="polite"
                        className="mb-3 text-sm text-ink-muted focus:outline-none"
                    >
                        {loading
                            ? t("adminSubscriptions.loading", "Loading subscriptions…")
                            : t("adminUsers.showing", "Showing {from}–{to} of {total}")
                                  .replace("{from}", String(firstShown))
                                  .replace("{to}", String(lastShown))
                                  .replace("{total}", String(total))}
                    </p>

                    {loading && subs.length === 0 ? null : error ? (
                        <p className="text-red-600 font-semibold">{error}</p>
                    ) : subs.length === 0 ? (
                        <div className="rounded-xl border border-line p-8 text-center">
                            <p className="text-ink-muted">
                                {hasFilters
                                    ? t("adminSubscriptions.noMatches", "No subscriptions match your filters.")
                                    : t("adminSubscriptions.empty", "No subscriptions yet.")}
                            </p>
                            {hasFilters ? (
                                <Button variant="ghost" className="mt-3" onClick={() => router.replace("/admin/subscriptions", { scroll: false })}>
                                    {t("adminUsers.clearFilters", "Clear filters")}
                                </Button>
                            ) : null}
                        </div>
                    ) : (
                        <ul
                            className={`border border-line rounded-xl divide-y divide-line overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}
                        >
                            {subs.map((sub) => (
                                <SubscriptionRow key={sub.userId} sub={sub} token={firebaseToken} />
                            ))}
                        </ul>
                    )}

                    {totalPages > 1 && !error ? (
                        <nav aria-label={t("jobs.pagination")} className="mt-6 flex items-center justify-between gap-3">
                            <Button variant="secondary" onClick={() => goToPage(filters.page - 1)} disabled={filters.page <= 1 || loading}>
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                <span className="max-sm:sr-only">{t("common.previous")}</span>
                            </Button>
                            <p className="text-sm tabular text-ink-muted">
                                {t("jobs.pageOf").replace("{page}", String(filters.page)).replace("{total}", String(totalPages))}
                            </p>
                            <Button variant="secondary" onClick={() => goToPage(filters.page + 1)} disabled={filters.page >= totalPages || loading}>
                                <span className="max-sm:sr-only">{t("common.next")}</span>
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </nav>
                    ) : null}
                </section>
            </div>
        </div>
    );
}
