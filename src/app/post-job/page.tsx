"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CategorySelector } from "@/components/CategorySelector";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { LocationPicker } from "@/components/ui/LocationPicker";
import { formatMoney } from "@/components/ui/MoneyPlate";
import { MoneyField } from "@/components/ui/MoneyField";
import { Skeleton } from "@/components/ui/QueryState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ReviewList, Stepper, WizardActionBar, WizardAlert } from "@/components/ui/Stepper";
import { BUDGET_TYPES, DURATIONS, EXPERIENCE_LEVELS } from "@/data/categories";
import { getCategoriesWithTranslations, getCategoryName, getExperienceLevelLabel, getBudgetTypeLabel, getDurationLabel } from "@/lib/category-utils";
import { planEntitlements } from "@/lib/plan-entitlements";
import { useTranslation } from "@/lib/i18n";
import { api } from "@/lib/api";
import { getSubscriptionStatus } from "@/api/subscriptions";
import { currentPath, signInPath } from "@/lib/auth-redirect";
import { geocodeAddress } from "@/lib/geocode";
import { clearDraft, defaultCurrencyForLocale, firstErrorKey, focusFieldById, hasRealCoordinates, loadDraft, parsePositiveAmount, saveDraft } from "@/lib/wizard";
import { useAuth } from "@/context/AuthContext";

type JobFormState = {
  title: string;
  description: string;
  category: string;
  budget: string;
  budgetType: string;
  /** Empty = follow the locale default until the user picks one. */
  budgetCurrency: string;
  duration: string;
  skillsRequired: string;
  experienceLevel: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  remote: boolean;
};

type FieldKey = "title" | "category" | "description" | "budget" | "location";
type FieldErrors = Partial<Record<FieldKey, string>>;

const INITIAL_FORM: JobFormState = {
  title: "",
  description: "",
  category: "",
  budget: "",
  budgetType: "FIXED",
  budgetCurrency: "",
  duration: "",
  skillsRequired: "",
  experienceLevel: "BEGINNER",
  location: "",
  latitude: null,
  longitude: null,
  remote: true,
};

const TOTAL_STEPS = 3;
const DRAFT_KEY = "w4u:draft:post-job";
const IDS: Record<FieldKey, string> = {
  title: "pj-title",
  category: "pj-category",
  description: "pj-description",
  budget: "pj-budget",
  location: "pj-location",
};
const STEP_FIELDS: Record<number, readonly FieldKey[]> = {
  1: ["title", "category", "description"],
  2: ["budget"],
  3: ["location"],
};

/** Existing labels carry a trailing " *"; Field adds its own required marker. */
const plain = (label: string) => label.replace(/\s*\*\s*$/, "");

export default function PostJobPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { firebaseToken, user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<JobFormState>(INITIAL_FORM);
  const [draftReady, setDraftReady] = useState(false);
  const [usage, setUsage] = useState<{ active: number; postLimit: number | null } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepMounted = useRef(false);
  // Coordinates found by the geocode fallback in validateStep (state is stale inside the same submit).
  const geocodedRef = useRef<{ lat: number; lng: number } | null>(null);

  const currency = formData.budgetCurrency || defaultCurrencyForLocale(locale);
  const categories = useMemo(() => getCategoriesWithTranslations(t), [t]);
  const steps = useMemo(
    () => [
      { title: t("post.step1Title"), description: t("post.step1Desc") },
      { title: t("post.step2Title"), description: t("post.step2Desc") },
      { title: t("post.step3Title"), description: t("post.step3Desc") },
    ],
    [t]
  );

  // Auth gate: wait for auth to resolve, then send guests to sign-in and back here.
  useEffect(() => {
    if (authLoading) return;
    if (!firebaseToken) router.replace(signInPath(currentPath()));
  }, [authLoading, firebaseToken, router]);

  // Restore a draft saved before a sign-in redirect.
  useEffect(() => {
    const draft = loadDraft<{ form: JobFormState; step: number }>(DRAFT_KEY);
    if (draft?.form) {
      setFormData({ ...INITIAL_FORM, ...draft.form });
      if (draft.step >= 1 && draft.step <= TOTAL_STEPS) setStep(draft.step);
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (draftReady) saveDraft(DRAFT_KEY, { form: formData, step });
  }, [draftReady, formData, step]);

  // Plan usage, when the data is available; failures are silent.
  useEffect(() => {
    if (authLoading || !firebaseToken || !user?.id) return;
    let cancelled = false;
    Promise.all([api.getMyJobs(user.id, firebaseToken), getSubscriptionStatus(firebaseToken)])
      .then(([jobs, sub]) => {
        if (cancelled) return;
        const now = new Date();
        const active = jobs.filter((j) => !j.expiresAt || new Date(j.expiresAt) > now).length;
        setUsage({ active, postLimit: planEntitlements(sub).postLimit });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [authLoading, firebaseToken, user?.id]);

  // Move focus to the step heading when the step changes (not on first render).
  useEffect(() => {
    if (!stepMounted.current) {
      stepMounted.current = true;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const updateField = useCallback(<K extends keyof JobFormState>(key: K, value: JobFormState[K], clears?: FieldKey) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (clears) setErrors((prev) => (prev[clears] ? { ...prev, [clears]: undefined } : prev));
  }, []);

  const showErrors = (next: FieldErrors, order: readonly FieldKey[]) => {
    setErrors(next);
    const first = firstErrorKey(order, next);
    if (first) focusFieldById(IDS[first]);
  };

  /** Returns true when the current step is valid. May geocode a typed address. */
  const validateStep = async (): Promise<boolean> => {
    const next: FieldErrors = {};
    geocodedRef.current = null;
    if (step === 1) {
      if (!formData.title.trim()) next.title = t("wizard.titleRequired");
      if (!formData.category.trim()) next.category = t("wizard.categoryRequired");
      if (!formData.description.trim()) next.description = t("wizard.descriptionRequired");
    } else if (step === 2) {
      if (parsePositiveAmount(formData.budget) === null) next.budget = t("wizard.budgetPositive");
    } else if (!formData.remote) {
      if (!formData.location.trim()) {
        next.location = t("post.validationStep3");
      } else if (!hasRealCoordinates(formData.latitude, formData.longitude)) {
        const point = await geocodeAddress(formData.location);
        if (point && hasRealCoordinates(point.lat, point.lng)) {
          geocodedRef.current = point;
          setFormData((prev) => ({ ...prev, latitude: point.lat, longitude: point.lng }));
        } else {
          next.location = t("wizard.locationNotFound");
        }
      }
    }
    showErrors(next, STEP_FIELDS[step]);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);
    setSubmitting(true);
    try {
      if (!(await validateStep())) return;
      if (step < TOTAL_STEPS) {
        setStep((prev) => prev + 1);
        return;
      }
      if (!firebaseToken) {
        router.push(signInPath(currentPath()));
        return;
      }

      const onSite = !formData.remote;
      const latitude = onSite ? (geocodedRef.current?.lat ?? formData.latitude) : null;
      const longitude = onSite ? (geocodedRef.current?.lng ?? formData.longitude) : null;
      if (onSite && !hasRealCoordinates(latitude, longitude)) {
        showErrors({ location: t("wizard.locationNotFound") }, STEP_FIELDS[3]);
        return;
      }

      const created = await api.createJob(
        {
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          budget: parsePositiveAmount(formData.budget),
          budgetType: formData.budgetType,
          budgetCurrency: currency,
          duration: formData.duration || undefined,
          experienceLevel: formData.experienceLevel,
          skillsRequired: formData.skillsRequired,
          location: onSite ? formData.location.trim() : "Remote",
          latitude,
          longitude,
          remote: formData.remote,
        },
        firebaseToken
      );

      clearDraft(DRAFT_KEY);
      // Remote jobs have no location to search "nearby" against.
      router.push(formData.remote ? "/my-jobs" : `/jobs/${created.id}/nearby-pros`);
    } catch (err) {
      console.error("Error creating job:", err);
      setFormError(err instanceof Error && err.message ? err.message : t("post.createError"));
    } finally {
      setSubmitting(false);
    }
  };

  // Enter inside the address combobox picks a suggestion; it must never publish the job.
  const blockEnterOnLocation = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && (event.target as HTMLElement).id === IDS.location) event.preventDefault();
  };

  if (authLoading || !firebaseToken) {
    return (
      <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-10" role="status" aria-busy="true">
        <span className="sr-only">{t("common.loading")}</span>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  const postLimit = usage?.postLimit ?? null;
  const freeLeft = usage && postLimit !== null ? Math.max(0, postLimit - usage.active) : null;

  return (
    <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-6 md:py-10">
      <Link href="/dashboard" className="inline-flex min-h-[44px] items-center gap-2 text-label text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("nav.backToDashboard")}
      </Link>
      <h1 className="mt-1 font-display text-h1 text-ink">{t("post.title")}</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-muted">{t("wizard.postJobSubtitle")}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        <Stepper steps={steps} current={step} label={t("wizard.postJobProgress")} className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start" />

        <form
          noValidate
          onSubmit={handleSubmit}
          aria-busy={submitting || undefined}
          className="min-w-0 md:rounded-card md:border md:border-line md:bg-surface md:p-8 md:shadow-stamp lg:max-w-[680px]"
        >
          {freeLeft !== null ? (
            freeLeft > 0 ? (
              <WizardAlert tone="info" className="mb-6">
                {t("wizard.planPostsLeft", "You have {left} of {limit} active posts left on your plan")
                  .replace("{left}", String(freeLeft))
                  .replace("{limit}", String(postLimit))}
              </WizardAlert>
            ) : (
              <WizardAlert tone="warning" className="mb-6">
                <p className="font-bold">
                  {t("myJobs.planLimitReachedTitle", "You've reached your plan's limit of {limit} active posts.").replace("{limit}", String(postLimit))}
                </p>
                <p className="mt-0.5">{t("myJobs.planLimitReachedBody", "Upgrade your plan for more active listings, longer visibility and post boosting.")}</p>
                <Link href="/pricing" className="mt-2 inline-flex min-h-[44px] items-center font-bold text-primary underline">
                  {t("wizard.viewPlans")}
                </Link>
              </WizardAlert>
            )
          ) : null}

          {formError ? <WizardAlert tone="error" className="mb-6">{formError}</WizardAlert> : null}

          <h2 ref={headingRef} tabIndex={-1} className="font-display text-h2 text-ink focus:outline-none">
            {steps[step - 1].title}
          </h2>
          <p className="mb-6 mt-1 text-body text-ink-muted">{steps[step - 1].description}</p>

          {step === 1 ? (
            <div className="space-y-6">
              <Input
                id={IDS.title}
                label={plain(t("post.labels.jobTitle"))}
                required
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value, "title")}
                error={errors.title}
                placeholder={t("post.titlePlaceholder")}
                autoComplete="off"
              />
              <CategorySelector
                id={IDS.category}
                label={plain(t("post.labels.category"))}
                required
                value={formData.category}
                onChange={(categoryId) => updateField("category", categoryId, "category")}
                categories={categories}
                error={errors.category}
              />
              <Textarea
                id={IDS.description}
                label={plain(t("post.labels.description"))}
                required
                rows={8}
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value, "description")}
                error={errors.description}
                placeholder={t("post.descPlaceholder")}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span aria-hidden="true" className="block text-label text-ink">{plain(t("post.labels.budgetType"))}</span>
                <SegmentedControl
                  label={plain(t("post.labels.budgetType"))}
                  value={formData.budgetType}
                  onChange={(value) => updateField("budgetType", value)}
                  options={BUDGET_TYPES.map((type) => ({ value: type.value, label: getBudgetTypeLabel(type.value, t) }))}
                  className="w-full [&>button]:flex-1"
                />
              </div>

              <MoneyField
                id={IDS.budget}
                label={plain(t("post.labels.budget"))}
                currencyLabel={t("post.labels.currency")}
                required
                amount={formData.budget}
                onAmountChange={(value) => updateField("budget", value, "budget")}
                currency={currency}
                onCurrencyChange={(value) => updateField("budgetCurrency", value)}
                error={errors.budget}
              />

              <Select
                label={`${plain(t("post.labels.duration"))} ${t("biz.optional")}`}
                value={formData.duration}
                onChange={(e) => updateField("duration", e.target.value)}
              >
                <option value="">{t("post.selectDuration")}</option>
                {DURATIONS.map((duration) => (
                  <option key={duration.value} value={duration.value}>{getDurationLabel(duration.value, t)}</option>
                ))}
              </Select>

              <div className="space-y-1.5">
                <span aria-hidden="true" className="block text-label text-ink">{plain(t("post.labels.experience"))}</span>
                <SegmentedControl
                  label={plain(t("post.labels.experience"))}
                  value={formData.experienceLevel}
                  onChange={(value) => updateField("experienceLevel", value)}
                  options={EXPERIENCE_LEVELS.map((level) => ({ value: level.value, label: getExperienceLevelLabel(level.value, t) }))}
                  className="w-full [&>button]:flex-1"
                />
              </div>

              <Input
                label={t("post.labels.skills")}
                value={formData.skillsRequired}
                onChange={(e) => updateField("skillsRequired", e.target.value)}
                placeholder={t("post.skillsPlaceholder")}
                autoComplete="off"
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6" onKeyDown={blockEnterOnLocation}>
              <div className="space-y-1.5">
                <span aria-hidden="true" className="block text-label text-ink">{t("post.workSetting")}</span>
                <SegmentedControl
                  label={t("post.workSetting")}
                  value={formData.remote ? "remote" : "onsite"}
                  onChange={(value) => {
                    updateField("remote", value === "remote");
                    setErrors((prev) => ({ ...prev, location: undefined }));
                  }}
                  options={[
                    { value: "remote", label: t("jobDetail.remote") },
                    { value: "onsite", label: t("jobs.onSite") },
                  ]}
                  className="w-full [&>button]:flex-1"
                />
              </div>

              {!formData.remote ? (
                <LocationPicker
                  id={IDS.location}
                  label={t("jobDetail.location")}
                  required
                  error={errors.location}
                  value={{ lat: formData.latitude ?? 0, lng: formData.longitude ?? 0, address: formData.location }}
                  onChange={({ lat, lng, address }) => {
                    setFormData((prev) => ({
                      ...prev,
                      location: address,
                      latitude: hasRealCoordinates(lat, lng) ? lat : null,
                      longitude: hasRealCoordinates(lat, lng) ? lng : null,
                    }));
                    setErrors((prev) => (prev.location ? { ...prev, location: undefined } : prev));
                  }}
                  addressPlaceholder={t("common.searchAddress")}
                />
              ) : null}

              <ReviewList
                title={t("common.review")}
                items={[
                  { label: t("common.title"), value: formData.title || t("dashboard.notSet") },
                  { label: t("jobs.category"), value: formData.category ? getCategoryName(formData.category, t) : t("dashboard.notSet") },
                  {
                    label: t("jobDetail.budget"),
                    value: (
                      <span className="font-display tabular-nums text-money">
                        {formatMoney(Number(formData.budget) || 0, currency, locale)}
                        {formData.budgetType === "HOURLY" ? ` ${t("jobDetail.hourly")}` : ""}
                      </span>
                    ),
                  },
                  { label: t("common.duration"), value: formData.duration ? getDurationLabel(formData.duration, t) : t("dashboard.notSet") },
                  { label: t("post.experienceLevelLabel"), value: getExperienceLevelLabel(formData.experienceLevel, t) },
                  { label: t("post.deliveryLabel"), value: formData.remote ? t("jobDetail.remote") : formData.location || t("post.locationPending") },
                ]}
              />
            </div>
          ) : null}

          <WizardActionBar>
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={() => setStep((prev) => Math.max(1, prev - 1))} disabled={submitting}>
                {t("post.actions.back")}
              </Button>
            ) : (
              <Link href="/dashboard" className={buttonClasses("secondary")}>
                {t("common.cancel")}
              </Link>
            )}
            <Button type="submit" loading={submitting} className="min-w-[8rem] flex-1 sm:flex-none">
              {step === TOTAL_STEPS ? (submitting ? t("post.publishing") : t("post.publishJob")) : t("common.continue")}
              {step < TOTAL_STEPS ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
            </Button>
          </WizardActionBar>
        </form>
      </div>
    </div>
  );
}
