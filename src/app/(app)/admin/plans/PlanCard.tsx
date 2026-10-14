"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";
import type { Plan, PlanLimits } from "@/api/subscriptions";

const MAX_POST_LIMIT = 100_000;
const MAX_EXPIRY_DAYS = 365;

const INPUT =
    "h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50";

interface PlanCardProps {
    plan: Plan;
    name: string;
    saved: PlanLimits;
    onSave: (plan: Plan, limits: PlanLimits) => Promise<void>;
}

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

/** Edit what one plan offers. Number fields are kept as text while typing so they can be briefly empty. */
export function PlanCard({ plan, name, saved, onSave }: PlanCardProps) {
    const { t } = useTranslation();
    const id = useId();
    const [unlimited, setUnlimited] = useState(saved.postLimit === null);
    const [postLimit, setPostLimit] = useState(String(saved.postLimit ?? 10));
    const [expiryDays, setExpiryDays] = useState(String(saved.expiryDays));
    const [boost, setBoost] = useState(saved.boost);
    const [companyFeatures, setCompanyFeatures] = useState(saved.companyFeatures);
    const [state, setState] = useState<SaveState>({ kind: "idle" });

    const parsedLimit = Number(postLimit);
    const parsedDays = Number(expiryDays);
    const limitValid = unlimited || (Number.isInteger(parsedLimit) && parsedLimit >= 0 && parsedLimit <= MAX_POST_LIMIT);
    const daysValid = Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= MAX_EXPIRY_DAYS;

    const draft: PlanLimits = { postLimit: unlimited ? null : parsedLimit, expiryDays: parsedDays, boost, companyFeatures };
    const isDirty =
        draft.postLimit !== saved.postLimit ||
        draft.expiryDays !== saved.expiryDays ||
        draft.boost !== saved.boost ||
        draft.companyFeatures !== saved.companyFeatures;

    const markEdited = () => setState({ kind: "idle" });

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!limitValid || !daysValid) return;
        setState({ kind: "saving" });
        try {
            await onSave(plan, draft);
            setState({ kind: "saved" });
        } catch (error) {
            setState({ kind: "error", message: error instanceof Error ? error.message : t("adminPlans.saveError", "Could not save.") });
        }
    };

    return (
        <form onSubmit={handleSubmit} aria-labelledby={`${id}-title`} className="flex flex-col rounded-xl border border-line bg-canvas p-5">
            <h2 id={`${id}-title`} className="text-xl font-bold text-ink">
                {name}
            </h2>

            <div className="mt-4 space-y-4">
                <div>
                    <label htmlFor={`${id}-limit`} className="mb-1.5 block text-sm font-medium text-ink">
                        {t("adminPlans.postLimit", "Active posts & service listings")}
                    </label>
                    <input
                        id={`${id}-limit`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={MAX_POST_LIMIT}
                        value={unlimited ? "" : postLimit}
                        placeholder={unlimited ? t("adminPlans.unlimited", "Unlimited") : undefined}
                        disabled={unlimited}
                        aria-invalid={!limitValid}
                        onChange={(event) => {
                            setPostLimit(event.target.value);
                            markEdited();
                        }}
                        className={INPUT}
                    />
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-ink">
                        <input
                            type="checkbox"
                            checked={unlimited}
                            onChange={(event) => {
                                setUnlimited(event.target.checked);
                                markEdited();
                            }}
                            className="h-4 w-4"
                        />
                        {t("adminPlans.unlimited", "Unlimited")}
                    </label>
                </div>

                <div>
                    <label htmlFor={`${id}-days`} className="mb-1.5 block text-sm font-medium text-ink">
                        {t("adminPlans.expiryDays", "Posts stay live for (days)")}
                    </label>
                    <input
                        id={`${id}-days`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_EXPIRY_DAYS}
                        value={expiryDays}
                        aria-invalid={!daysValid}
                        onChange={(event) => {
                            setExpiryDays(event.target.value);
                            markEdited();
                        }}
                        className={INPUT}
                    />
                </div>

                <fieldset className="space-y-2">
                    <legend className="sr-only">{t("adminPlans.features", "Features")}</legend>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                        <input
                            type="checkbox"
                            checked={boost}
                            onChange={(event) => {
                                setBoost(event.target.checked);
                                markEdited();
                            }}
                            className="h-4 w-4"
                        />
                        {t("adminPlans.boost", "Can boost job posts")}
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                        <input
                            type="checkbox"
                            checked={companyFeatures}
                            onChange={(event) => {
                                setCompanyFeatures(event.target.checked);
                                markEdited();
                            }}
                            className="h-4 w-4"
                        />
                        {t("adminPlans.companyFeatures", "Company profile, roster & shift scheduling")}
                    </label>
                </fieldset>
            </div>

            {!limitValid || !daysValid ? (
                <p role="alert" className="mt-3 text-sm text-danger">
                    {t("adminPlans.invalid", "Posts: 0–{maxPosts} or Unlimited. Days: 1–{maxDays}.")
                        .replace("{maxPosts}", MAX_POST_LIMIT.toLocaleString())
                        .replace("{maxDays}", String(MAX_EXPIRY_DAYS))}
                </p>
            ) : null}

            <div className="mt-auto flex items-center gap-3 pt-5">
                <Button type="submit" disabled={!isDirty || !limitValid || !daysValid} loading={state.kind === "saving"}>
                    {t("adminPlans.save", "Save")}
                </Button>
                <p aria-live="polite" className="text-sm">
                    {state.kind === "saved" ? <span className="text-success">{t("adminPlans.saved", "Saved")}</span> : null}
                    {state.kind === "error" ? <span className="text-danger">{state.message}</span> : null}
                </p>
            </div>
        </form>
    );
}
