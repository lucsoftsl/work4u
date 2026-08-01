"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
    fetchUsers,
    suspendUser,
    reactivateUser,
    setUserSubscription,
    type AdminUserSummary,
    type AdminGrantablePlan,
} from "@/lib/admin-api";
import { SetSubscriptionModal } from "@/components/admin/SetSubscriptionModal";

const STATUS_STYLES: Record<AdminUserSummary["status"], string> = {
    ACTIVE: "bg-green-50 text-green-700",
    PENDING_VERIFICATION: "bg-blue-50 text-blue-700",
    PENDING_DELETION: "bg-amber-50 text-amber-700",
    SUSPENDED: "bg-red-50 text-red-700",
};

export default function AdminUsersPage() {
    const { t } = useTranslation();
    const { user, firebaseToken } = useAuth();
    const router = useRouter();

    const [users, setUsers] = useState<AdminUserSummary[]>([]);
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

        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchUsers(firebaseToken);
                setUsers(data);
            } catch (err) {
                console.error("Failed to load users:", err);
                setError(t("adminUsers.loadError"));
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [firebaseToken, user?.userType, t]);

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
        <div className="min-h-screen bg-card">
            <div className="max-w-5xl mx-auto px-4 py-16">
                <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    <ArrowLeft className="w-4 h-4" />
                    {t("admin.backToDashboard")}
                </Link>
                <h1 className="mt-4 text-4xl font-bold text-foreground mb-2">{t("adminUsers.title")}</h1>
                <p className="text-muted-foreground mb-10">{t("adminUsers.subtitle")}</p>

                {loading ? (
                    <p className="text-muted-foreground">{t("adminUsers.loading")}</p>
                ) : error ? (
                    <p className="text-red-600 font-semibold">{error}</p>
                ) : users.length === 0 ? (
                    <p className="text-muted-foreground">{t("adminUsers.empty")}</p>
                ) : (
                    <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                        {users.map((u) => (
                            <div key={u.id} className="flex flex-wrap items-center justify-between gap-4 p-4 bg-background">
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate">{u.displayName || u.email}</p>
                                    <p className="text-sm text-muted-foreground truncate">{u.email} · {u.userType}</p>
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
                                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground bg-background hover:bg-muted disabled:opacity-50"
                                            >
                                                {t("adminUsers.setPlanPlaceholder")}
                                            </button>
                                            <button
                                                onClick={() => handleToggleSuspend(u)}
                                                disabled={actingOnId === u.id}
                                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
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
