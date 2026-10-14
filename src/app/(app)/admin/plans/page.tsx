"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/LocaleLink";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { getPlanLimits, updatePlanLimits, type Plan, type PlanLimits } from "@/api/subscriptions";
import { PlanCard } from "./PlanCard";

const PLANS: readonly Plan[] = ["free", "starter", "pro", "business"];

export default function AdminPlansPage() {
    const { t } = useTranslation();
    const { user, firebaseToken } = useAuth();
    const [limits, setLimits] = useState<Partial<Record<Plan, PlanLimits>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isActive = true;
        getPlanLimits()
            .then((rows) => {
                if (!isActive) return;
                setLimits(Object.fromEntries(rows.map(({ plan, ...rest }) => [plan, rest])));
            })
            .catch((err) => {
                console.error("Failed to load plan limits:", err);
                if (isActive) setError(t("adminPlans.loadError", "Failed to load plan settings."));
            })
            .finally(() => {
                if (isActive) setLoading(false);
            });
        return () => {
            isActive = false;
        };
    }, [t]);

    const handleSave = useCallback(
        async (plan: Plan, next: PlanLimits) => {
            if (!firebaseToken) throw new Error(t("adminPlans.saveError", "Could not save."));
            const { plan: savedPlan, ...saved } = await updatePlanLimits(firebaseToken, plan, next);
            setLimits((prev) => ({ ...prev, [savedPlan]: saved }));
        },
        [firebaseToken, t]
    );

    if (user?.userType !== "ADMIN") return null;

    return (
        <div className="min-h-screen bg-surface">
            <div className="max-w-6xl mx-auto px-4 py-16">
                <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    <ArrowLeft className="w-4 h-4" />
                    {t("admin.backToDashboard")}
                </Link>
                <h1 className="mt-4 text-4xl font-bold text-ink mb-2">{t("adminPlans.title", "Plans")}</h1>
                <p className="text-ink-muted mb-2">
                    {t("adminPlans.subtitle", "Choose what each plan offers. Changes apply to everyone on that plan within a minute.")}
                </p>
                <p className="text-sm text-ink-muted mb-8">
                    {t("adminPlans.adminNote", "Admins always have every feature, whatever these settings say. Prices are set in Stripe.")}
                </p>

                {loading ? (
                    <p className="text-ink-muted">{t("adminPlans.loading", "Loading plan settings…")}</p>
                ) : error ? (
                    <p className="font-semibold text-danger">{error}</p>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {PLANS.map((plan) => {
                            const saved = limits[plan];
                            return saved ? (
                                <PlanCard
                                    key={plan}
                                    plan={plan}
                                    name={t(`pricing.${plan}TierName`)}
                                    saved={saved}
                                    onSave={handleSave}
                                />
                            ) : null;
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
