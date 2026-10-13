"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Field";
import { MoneyField } from "@/components/ui/MoneyField";
import { formatMoney } from "@/components/ui/MoneyPlate";
import { ErrorState, Skeleton } from "@/components/ui/QueryState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ReviewList, Stepper, WizardActionBar, WizardAlert } from "@/components/ui/Stepper";
import { BUDGET_TYPES, DURATIONS, EXPERIENCE_LEVELS } from "@/data/categories";
import { ArrowLeft, Lock } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getCategoriesWithTranslations, getBudgetTypeLabel, getDurationLabel, getExperienceLevelLabel } from "@/lib/category-utils";
import { CategorySelector } from "@/components/CategorySelector";
import { firstErrorKey, focusFieldById, parsePositiveAmount } from "@/lib/wizard";
import { api } from "@/lib/api";
import { ApiError, errorMessage } from "@/lib/http";
import { currentPath, signInPath } from "@/lib/auth-redirect";
import { useAuth } from "@/context/AuthContext";
import type { Job } from "@/api/types";

type EditForm = {
    title: string;
    description: string;
    category: string;
    subCategory: string;
    budget: string;
    budgetType: string;
    budgetCurrency: string;
    duration: string;
    skillsRequired: string;
    experienceLevel: string;
    location: string;
    remote: boolean;
};

// Fields the Job record actually holds; always diffed against the loaded job.
const JOB_FIELDS = ["title", "description", "category", "budgetType", "budgetCurrency", "location", "remote"] as const;
// Form-only fields the Job type doesn't hold; only sent when the user actually set them.
const EXTRA_FIELDS = ["subCategory", "duration", "skillsRequired", "experienceLevel"] as const;

const TOTAL_STEPS = 4;

type FieldKey = "title" | "category" | "description" | "budget" | "confirm";
type FieldErrors = Partial<Record<FieldKey, string>>;
const IDS: Record<FieldKey, string> = { title: "ej-title", category: "ej-category", description: "ej-description", budget: "ej-budget", confirm: "ej-confirm" };
const STEP_FIELDS: Record<number, readonly FieldKey[]> = { 1: ["title", "category", "description"], 2: ["budget"], 3: [], 4: ["confirm"] };

function formFromJob(job: Job): EditForm {
    return {
        title: job.title,
        description: job.description,
        category: job.category,
        subCategory: "",
        budget: String(job.budget),
        budgetType: job.budgetType,
        budgetCurrency: job.budgetCurrency,
        duration: "",
        skillsRequired: "",
        experienceLevel: "",
        location: job.location ?? "",
        remote: job.remote,
    };
}

/** Only the fields that differ from what was loaded. */
function buildPatch(initial: EditForm, current: EditForm): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    for (const key of JOB_FIELDS) {
        if (current[key] !== initial[key]) patch[key] = current[key];
    }
    if (current.budget !== initial.budget && Number(current.budget) !== Number(initial.budget)) {
        patch.budget = Number(current.budget);
    }
    for (const key of EXTRA_FIELDS) {
        const value = current[key].trim();
        if (value && value !== initial[key]) patch[key] = value;
    }
    return patch;
}

function isConflict(error: unknown): boolean {
    if (error instanceof ApiError) return error.status === 409;
    return error instanceof Error && /no longer be edited|409/i.test(error.message);
}

export default function EditJobPage() {
    const { t, locale } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const jobId = params?.id as string;
    const [step, setStep] = useState(1);
    const [job, setJob] = useState<Job | null>(null);
    const [loadingJob, setLoadingJob] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [confirmed, setConfirmed] = useState(false);
    const [initialForm, setInitialForm] = useState<EditForm | null>(null);
    const [formData, setFormData] = useState<EditForm | null>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const stepMounted = useRef(false);

    const { firebaseToken, user, loading: authLoading } = useAuth();
    const categories = useMemo(() => getCategoriesWithTranslations(t), [t]);
    const steps = useMemo(
        () => [
            { title: t("post.steps.basics") },
            { title: t("post.steps.details") },
            { title: t("post.steps.location") },
            { title: t("post.steps.review") },
        ],
        [t]
    );

    const loadJob = useCallback(async () => {
        if (!jobId) return;
        setLoadingJob(true);
        setLoadError(null);
        try {
            const loaded = await api.getJob(jobId);
            const form = formFromJob(loaded);
            setJob(loaded);
            setInitialForm(form);
            setFormData(form);
        } catch (error) {
            console.error("Failed to load job:", error);
            setLoadError(errorMessage(error, t('jobDetail.updateError')));
        } finally {
            setLoadingJob(false);
        }
    }, [jobId, t]);

    useEffect(() => {
        void loadJob();
    }, [loadJob]);

    // Ownership check only once auth has resolved, so a hard reload doesn't bounce the owner.
    const isOwner = Boolean(job && user?.id && user.id === job.createdByUserId);
    useEffect(() => {
        if (authLoading || !job) return;
        if (!user) {
            router.replace(signInPath(currentPath()));
            return;
        }
        if (user.id !== job.createdByUserId) {
            router.replace(`/jobs/${job.id}`);
        }
    }, [authLoading, job, user, router]);

    useEffect(() => {
        if (!stepMounted.current) {
            stepMounted.current = true;
            return;
        }
        headingRef.current?.focus();
        window.scrollTo({ top: 0 });
    }, [step]);

    const updateField = <K extends keyof EditForm>(name: K, value: EditForm[K], clears?: FieldKey) => {
        setNotice(null);
        setFormError(null);
        if (clears) setErrors((prev) => (prev[clears] ? { ...prev, [clears]: undefined } : prev));
        setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
    };

    const validateStep = (current: EditForm): boolean => {
        const next: FieldErrors = {};
        if (step === 1) {
            if (!current.title.trim()) next.title = t("wizard.titleRequired");
            if (!current.category.trim()) next.category = t("wizard.categoryRequired");
            if (!current.description.trim()) next.description = t("wizard.descriptionRequired");
        } else if (step === 2) {
            if (parsePositiveAmount(current.budget) === null) next.budget = t("wizard.budgetPositive");
        } else if (step === 4 && !confirmed) {
            next.confirm = t("wizard.confirmRequired");
        }
        setErrors(next);
        const first = firstErrorKey(STEP_FIELDS[step], next);
        if (first) focusFieldById(IDS[first]);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!formData || !initialForm || submitting) return;
        if (!validateStep(formData)) return;
        if (step < TOTAL_STEPS) {
            setStep(step + 1);
            return;
        }
        if (!firebaseToken) {
            router.push(signInPath(currentPath()));
            return;
        }

        const patch = buildPatch(initialForm, formData);
        if (Object.keys(patch).length === 0) {
            setNotice(t('jobEdit.noChanges'));
            return;
        }

        setSubmitting(true);
        setFormError(null);
        setNotice(null);
        try {
            await api.updateJob(jobId, patch, firebaseToken);
            router.push(`/jobs/${jobId}`);
        } catch (error) {
            console.error('Error updating job:', error);
            if (isConflict(error)) {
                setFormError(t('jobEdit.conflict'));
            } else if (error instanceof ApiError && error.status === 429) {
                setFormError(t('jobEdit.rateLimited'));
            } else {
                setFormError(errorMessage(error, t('jobDetail.updateError')));
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingJob || authLoading || (job && !isOwner && !loadError)) {
        return (
            <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-10" role="status" aria-busy="true">
                <span className="sr-only">{t('common.loading')}</span>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="mt-6 h-64 w-full" />
            </div>
        );
    }

    if (loadError || !job || !formData) {
        return (
            <div className="mx-auto w-full max-w-2xl space-y-4 px-[var(--gutter)] py-10">
                <h1 className="font-display text-h1 text-ink">{t('jobDetail.editJob')}</h1>
                <ErrorState message={loadError} onRetry={() => void loadJob()} />
                <Link href="/my-jobs" className={buttonClasses("secondary")}>
                    {t('jobEdit.backToMyJobs')}
                </Link>
            </div>
        );
    }

    if (job.lifecycleStatus !== "OPEN") {
        return (
            <div className="mx-auto w-full max-w-2xl px-[var(--gutter)] py-10">
                <div className="space-y-3 rounded-card border border-line bg-surface p-6 shadow-stamp" role="status">
                    <div className="flex items-center gap-2 text-ink">
                        <Lock size={18} aria-hidden="true" />
                        <h1 className="font-display text-h2">{t('jobEdit.lockedTitle')}</h1>
                    </div>
                    <p className="text-body text-ink-muted">{t('jobEdit.lockedDesc')}</p>
                    <Link href={`/jobs/${jobId}`} className={buttonClasses("secondary")}>
                        {t('jobEdit.backToJob')}
                    </Link>
                </div>
            </div>
        );
    }

    const categoryName = categories.find((c) => c.id === formData.category)?.name ?? formData.category;

    return (
        <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-6 md:py-10">
            <Link href={`/jobs/${jobId}`} className="inline-flex min-h-[44px] items-center gap-2 text-label text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t('jobEdit.backToJob')}
            </Link>
            <h1 className="mt-1 font-display text-h1 text-ink">{t('jobDetail.editJob')}</h1>

            <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
                <Stepper steps={steps} current={step} label={t('jobDetail.editJob')} className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start" />

                <form
                    noValidate
                    onSubmit={handleSubmit}
                    aria-busy={submitting || undefined}
                    className="min-w-0 md:rounded-card md:border md:border-line md:bg-surface md:p-8 md:shadow-stamp lg:max-w-[680px]"
                >
                    <h2 ref={headingRef} tabIndex={-1} className="mb-6 font-display text-h2 text-ink focus:outline-none">
                        {steps[step - 1].title}
                    </h2>

                    {step === 1 && (
                        <div className="space-y-6">
                            <Input
                                id={IDS.title}
                                label={t('post.labels.jobTitle').replace(/\s*\*\s*$/, "")}
                                required
                                value={formData.title}
                                onChange={(e) => updateField("title", e.target.value, "title")}
                                error={errors.title}
                                placeholder={t('post.titlePlaceholder')}
                                autoComplete="off"
                            />
                            <CategorySelector
                                id={IDS.category}
                                label={t('post.labels.category').replace(/\s*\*\s*$/, "")}
                                required
                                value={formData.category}
                                onChange={(categoryId) => updateField("category", categoryId, "category")}
                                categories={categories}
                                error={errors.category}
                            />
                            <Textarea
                                id={IDS.description}
                                label={t('post.labels.description').replace(/\s*\*\s*$/, "")}
                                required
                                rows={8}
                                value={formData.description}
                                onChange={(e) => updateField("description", e.target.value, "description")}
                                error={errors.description}
                                placeholder={t('post.descPlaceholder')}
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <span aria-hidden="true" className="block text-label text-ink">{t('post.labels.budgetType').replace(/\s*\*\s*$/, "")}</span>
                                <SegmentedControl
                                    label={t('post.labels.budgetType').replace(/\s*\*\s*$/, "")}
                                    value={formData.budgetType}
                                    onChange={(value) => updateField("budgetType", value)}
                                    options={BUDGET_TYPES.map((type) => ({ value: type.value, label: getBudgetTypeLabel(type.value, t) }))}
                                    className="w-full [&>button]:flex-1"
                                />
                            </div>

                            <MoneyField
                                id={IDS.budget}
                                label={t('post.labels.budget').replace(/\s*\*\s*$/, "")}
                                currencyLabel={t('post.labels.currency')}
                                required
                                amount={formData.budget}
                                onAmountChange={(value) => updateField("budget", value, "budget")}
                                currency={formData.budgetCurrency}
                                onCurrencyChange={(value) => updateField("budgetCurrency", value)}
                                error={errors.budget}
                            />

                            <Select
                                label={`${t('post.labels.duration').replace(/\s*\*\s*$/, "")} ${t('biz.optional')}`}
                                value={formData.duration}
                                onChange={(e) => updateField("duration", e.target.value)}
                            >
                                <option value="">{t('post.selectDuration')}</option>
                                {DURATIONS.map((dur) => (
                                    <option key={dur.value} value={dur.value}>{getDurationLabel(dur.value, t)}</option>
                                ))}
                            </Select>

                            <Select
                                label={`${t('post.labels.experience').replace(/\s*\*\s*$/, "")} ${t('biz.optional')}`}
                                value={formData.experienceLevel}
                                onChange={(e) => updateField("experienceLevel", e.target.value)}
                            >
                                <option value="">—</option>
                                {EXPERIENCE_LEVELS.map((level) => (
                                    <option key={level.value} value={level.value}>{getExperienceLevelLabel(level.value, t)}</option>
                                ))}
                            </Select>

                            <Input
                                label={t('post.labels.skills')}
                                value={formData.skillsRequired}
                                onChange={(e) => updateField("skillsRequired", e.target.value)}
                                placeholder={t('post.skillsPlaceholder')}
                                autoComplete="off"
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <Checkbox
                                label={
                                    <span>
                                        <span className="block font-bold">{t('post.labels.remote')}</span>
                                        <span className="block text-caption text-ink-muted">{t('post.labels.remoteDesc')}</span>
                                    </span>
                                }
                                checked={formData.remote}
                                onChange={(e) => updateField("remote", e.target.checked)}
                            />
                            {!formData.remote && (
                                <Input
                                    label={t('post.labels.location')}
                                    value={formData.location}
                                    onChange={(e) => updateField("location", e.target.value)}
                                    placeholder={t('post.labels.locationPlaceholder')}
                                    autoComplete="street-address"
                                />
                            )}
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6">
                            <ReviewList
                                title={t('common.review')}
                                items={[
                                    { label: t('post.review.title'), value: formData.title },
                                    { label: t('post.review.category'), value: categoryName },
                                    {
                                        label: t('post.review.budget'),
                                        value: (
                                            <span className="font-display tabular-nums text-money">
                                                {formatMoney(Number(formData.budget) || 0, formData.budgetCurrency, locale)} ({getBudgetTypeLabel(formData.budgetType, t)})
                                            </span>
                                        ),
                                    },
                                    { label: t('post.review.location'), value: formData.remote ? t('post.review.remote') : formData.location || t('dashboard.notSet') },
                                ]}
                            />
                            <Checkbox
                                id={IDS.confirm}
                                label={t('jobDetail.confirmUpdate')}
                                checked={confirmed}
                                onChange={(e) => {
                                    setConfirmed(e.target.checked);
                                    setErrors((prev) => ({ ...prev, confirm: undefined }));
                                }}
                                error={errors.confirm}
                            />
                        </div>
                    )}

                    {notice ? <WizardAlert tone="info" className="mt-6">{notice}</WizardAlert> : null}
                    {formError ? <WizardAlert tone="error" className="mt-6">{formError}</WizardAlert> : null}

                    <WizardActionBar>
                        {step > 1 ? (
                            <Button type="button" variant="secondary" onClick={() => setStep(step - 1)} disabled={submitting}>
                                {t('post.actions.back')}
                            </Button>
                        ) : (
                            <Link href={`/jobs/${jobId}`} className={buttonClasses("secondary")}>
                                {t('common.cancel')}
                            </Link>
                        )}
                        <Button type="submit" loading={submitting} className="min-w-[8rem] flex-1 sm:flex-none">
                            {submitting ? t('jobDetail.updating') : step === TOTAL_STEPS ? t('jobDetail.saveChanges') : t('post.actions.continue')}
                        </Button>
                    </WizardActionBar>
                </form>
            </div>
        </div>
    );
}
