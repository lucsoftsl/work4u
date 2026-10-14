"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "@/components/LocaleLink";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { scrollToListStart } from "@/lib/scroll";
import { Button } from "@/components/ui/Button";
import {
    fetchUsers,
    suspendUser,
    reactivateUser,
    setUserSubscription,
    type AdminUserSummary,
    type AdminGrantablePlan,
    type AdminUserSort,
} from "@/lib/admin-api";
import { SetSubscriptionModal } from "@/components/admin/SetSubscriptionModal";
import { USER_SORTS, UsersToolbar, type UserFilters } from "./users-toolbar";

const STATUS_STYLES: Record<AdminUserSummary["status"], string> = {
    ACTIVE: "bg-green-50 text-green-700",
    PENDING_VERIFICATION: "bg-blue-50 text-blue-700",
    PENDING_DELETION: "bg-amber-50 text-amber-700",
    SUSPENDED: "bg-red-50 text-red-700",
};

const PAGE_SIZE = 25;

// Search, filters, sort and page live in the URL so a filtered view survives reloads and can be shared.
function readFilters(params: URLSearchParams): UserFilters & { page: number } {
    const sort = params.get("sort") as AdminUserSort | null;
    const page = Number(params.get("page"));
    return {
        q: params.get("q") ?? "",
        status: params.get("status") ?? "",
        userType: params.get("type") ?? "",
        sort: sort && USER_SORTS.includes(sort) ? sort : "joined_desc",
        page: Number.isInteger(page) && page > 0 ? page : 1,
    };
}

export default function AdminUsersPage() {
    return (
        <Suspense fallback={null}>
            <AdminUsersContent />
        </Suspense>
    );
}

function AdminUsersContent() {
    const { t, locale } = useTranslation();
    const { user, firebaseToken } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const filters = useMemo(() => readFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
    const listRef = useRef<HTMLElement>(null);
    const summaryRef = useRef<HTMLParagraphElement>(null);

    const [users, setUsers] = useState<AdminUserSummary[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actingOnId, setActingOnId] = useState<string | null>(null);
    const [planModalUser, setPlanModalUser] = useState<AdminUserSummary | null>(null);
    const [planModalInitialPlan, setPlanModalInitialPlan] = useState<AdminGrantablePlan>("free");

    useEffect(() => {
        if (user && user.userType !== "ADMIN") {
            router.push("/");
        }
    }, [user, router]);

    useEffect(() => {
        if (!firebaseToken || user?.userType !== "ADMIN") return;

        let isActive = true;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchUsers(firebaseToken, {
                    q: filters.q,
                    status: (filters.status || undefined) as AdminUserSummary["status"] | undefined,
                    userType: (filters.userType || undefined) as AdminUserSummary["userType"] | undefined,
                    sort: filters.sort,
                    limit: PAGE_SIZE,
                    offset: (filters.page - 1) * PAGE_SIZE,
                });
                if (!isActive) return;
                setUsers(data.items);
                setTotal(data.total);
            } catch (err) {
                console.error("Failed to load users:", err);
                if (isActive) setError(t("adminUsers.loadError"));
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
        (patch: Partial<UserFilters> & { page?: number }) => {
            const next = new URLSearchParams(searchParams.toString());
            const keys: Record<string, string> = { q: "q", status: "status", userType: "type", sort: "sort", page: "page" };
            for (const [field, value] of Object.entries(patch)) {
                const key = keys[field];
                const isDefault = value === "" || (field === "sort" && value === "joined_desc") || (field === "page" && value === 1);
                if (isDefault) next.delete(key);
                else next.set(key, String(value));
            }
            // Any change other than paging starts again from the first page.
            if (!("page" in patch)) next.delete("page");
            const qs = next.toString();
            router.replace(qs ? `/admin/users?${qs}` : "/admin/users", { scroll: false });
        },
        [router, searchParams]
    );

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const firstShown = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
    const lastShown = Math.min(filters.page * PAGE_SIZE, total);
    const hasFilters = Boolean(filters.q || filters.status || filters.userType);
    const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }), [locale]);

    const goToPage = (page: number) => {
        updateFilters({ page });
        scrollToListStart(listRef.current, summaryRef.current);
    };

    function formatJoined(value: string): string {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
    }

    async function handleToggleSuspend(target: AdminUserSummary) {
        if (!firebaseToken) return;
        setActingOnId(target.id);
        try {
            const updated =
                target.status === "SUSPENDED"
                    ? await reactivateUser(target.id, firebaseToken)
                    : await suspendUser(target.id, firebaseToken);
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        } catch (err) {
            console.error("Failed to update user status:", err);
            alert(err instanceof Error ? err.message : t("adminUsers.updateStatusError"));
        } finally {
            setActingOnId(null);
        }
    }

    async function handleSetPlan(
        plan: AdminGrantablePlan,
        options: { reason?: string; activeFrom?: string; activeTo?: string }
    ) {
        if (!firebaseToken || !planModalUser) return;
        setActingOnId(planModalUser.id);
        try {
            await setUserSubscription(planModalUser.id, plan, firebaseToken, options);
            setPlanModalUser(null);
        } catch (err) {
            console.error("Failed to set subscription plan:", err);
            alert(err instanceof Error ? err.message : t("adminUsers.setPlanError"));
        } finally {
            setActingOnId(null);
        }
    }

    if (user?.userType !== "ADMIN") {
        return null;
    }

    return (
        <div className="min-h-screen bg-surface">
            <div className="max-w-5xl mx-auto px-4 py-16">
                <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    <ArrowLeft className="w-4 h-4" />
                    {t("admin.backToDashboard")}
                </Link>
                <h1 className="mt-4 text-4xl font-bold text-ink mb-2">{t("adminUsers.title")}</h1>
                <p className="text-ink-muted mb-8">{t("adminUsers.subtitle")}</p>

                <UsersToolbar filters={filters} onChange={updateFilters} />

                <section ref={listRef} aria-labelledby="admin-users-summary" className="mt-6 scroll-mt-[calc(var(--header-h)+1rem)]">
                    <p ref={summaryRef} id="admin-users-summary" tabIndex={-1} aria-live="polite" className="mb-3 text-sm text-ink-muted focus:outline-none">
                        {loading
                            ? t("adminUsers.loading")
                            : t("adminUsers.showing", "Showing {from}–{to} of {total}")
                                  .replace("{from}", String(firstShown))
                                  .replace("{to}", String(lastShown))
                                  .replace("{total}", String(total))}
                    </p>

                    {loading && users.length === 0 ? null : error ? (
                        <p className="text-red-600 font-semibold">{error}</p>
                    ) : users.length === 0 ? (
                        <div className="rounded-xl border border-line p-8 text-center">
                            <p className="text-ink-muted">
                                {hasFilters ? t("adminUsers.noMatches", "No users match your search.") : t("adminUsers.empty")}
                            </p>
                            {hasFilters ? (
                                <Button variant="ghost" className="mt-3" onClick={() => router.replace("/admin/users", { scroll: false })}>
                                    {t("adminUsers.clearFilters", "Clear filters")}
                                </Button>
                            ) : null}
                        </div>
                    ) : (
                        <div className={`border border-line rounded-xl divide-y divide-line overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}>
                        {users.map((u) => (
                            <div key={u.id} className="flex flex-wrap items-center justify-between gap-4 p-4 bg-canvas">
                                <div className="min-w-0">
                                    <p className="font-semibold text-ink truncate">{u.displayName || u.email}</p>
                                    <p className="text-sm text-ink-muted truncate">{u.email} · {u.userType}</p>
                                    <p className="text-xs text-ink-muted">
                                        {t("adminUsers.joined", "Joined {date}").replace("{date}", formatJoined(u.dateTimeCreated))}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[u.status]}`}>
                                        {u.status}
                                    </span>
                                    {u.userType !== "ADMIN" && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setPlanModalInitialPlan("free");
                                                    setPlanModalUser(u);
                                                }}
                                                disabled={actingOnId === u.id}
                                                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink bg-canvas hover:bg-sunken disabled:opacity-50"
                                            >
                                                {t("adminUsers.setPlanPlaceholder")}
                                            </button>
                                            <button
                                                onClick={() => handleToggleSuspend(u)}
                                                disabled={actingOnId === u.id}
                                                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken disabled:opacity-50"
                                            >
                                                {u.status === "SUSPENDED" ? t("adminUsers.reactivate") : t("adminUsers.suspend")}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        </div>
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
            <SetSubscriptionModal
                isOpen={planModalUser !== null}
                user={planModalUser}
                initialPlan={planModalInitialPlan}
                onClose={() => setPlanModalUser(null)}
                onSave={handleSetPlan}
                isLoading={actingOnId === planModalUser?.id}
            />
        </div>
    );
}
