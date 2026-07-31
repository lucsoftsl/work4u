"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CurrencyInput from "react-currency-input-field";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { CurrencySelector } from "@/components/CurrencySelector";
import { CategorySelector } from "@/components/CategorySelector";
import { LocationPicker } from "@/components/ui/LocationPicker";
import { BUDGET_TYPES, DURATIONS, EXPERIENCE_LEVELS } from "@/data/categories";
import { getCategoriesWithTranslations, getCategoryName, getExperienceLevelLabel, getBudgetTypeLabel, getDurationLabel } from "@/lib/category-utils";
import { useTranslation } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type JobFormState = {
  title: string;
  description: string;
  category: string;
  budget: string;
  budgetType: string;
  budgetCurrency: string;
  duration: string;
  skillsRequired: string;
  experienceLevel: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  remote: boolean;
};

const INITIAL_FORM: JobFormState = {
  title: "",
  description: "",
  category: "",
  budget: "",
  budgetType: "FIXED",
  budgetCurrency: "USD",
  duration: "",
  skillsRequired: "",
  experienceLevel: "BEGINNER",
  location: "",
  latitude: null,
  longitude: null,
  remote: true,
};

export default function PostJobPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { firebaseToken } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<JobFormState>(INITIAL_FORM);

  const categories = useMemo(() => getCategoriesWithTranslations(t), [t]);
  const STEPS = useMemo(
    () => [
      { title: t('post.step1Title'), description: t('post.step1Desc') },
      { title: t('post.step2Title'), description: t('post.step2Desc') },
      { title: t('post.step3Title'), description: t('post.step3Desc') },
    ],
    [t]
  );

  const updateField = <K extends keyof JobFormState>(key: K, value: JobFormState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.title.trim() || !formData.category.trim() || !formData.description.trim()) {
        setError(t('post.validationStep1'));
        return false;
      }
    }

    if (step === 2) {
      if (!formData.budget || !formData.duration || !formData.experienceLevel) {
        setError(t('post.validationStep2'));
        return false;
      }
    }

    if (step === 3) {
      if (!formData.remote && !formData.location.trim()) {
        setError(t('post.validationStep3'));
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleContinue = async () => {
    if (!validateStep()) return;

    if (step < STEPS.length) {
      setStep((prev) => prev + 1);
      return;
    }

    if (!firebaseToken) {
      router.push("/signin");
      return;
    }

    setSubmitting(true);
    try {
      const location = formData.remote ? "Remote" : formData.location.trim();

      const created = await api.createJob(
        {
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          budget: Number(formData.budget),
          budgetType: formData.budgetType,
          budgetCurrency: formData.budgetCurrency,
          duration: formData.duration,
          experienceLevel: formData.experienceLevel,
          skillsRequired: formData.skillsRequired,
          location,
          latitude: formData.remote ? null : formData.latitude,
          longitude: formData.remote ? null : formData.longitude,
          remote: formData.remote,
        },
        firebaseToken
      );

      // Remote jobs have no location to search "nearby" against — the
      // discovery map only makes sense for on-site work.
      router.push(formData.remote ? "/my-jobs" : `/jobs/${created.id}/nearby-pros`);
    } catch (err) {
      console.error("Error creating job:", err);
      setError(err instanceof Error ? err.message : t('post.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="surface-card overflow-hidden p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                <ArrowLeft className="h-4 w-4" />
                {t("nav.backToDashboard")}
              </Link>
              <span className="eyebrow mt-4">{t('post.eyebrow')}</span>
              <h1 className="mt-4 section-heading">{t('post.heading')}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
                {t('post.subtitle')}
              </p>
            </div>
            <div className="rounded-[24px] bg-[#eff7fa] px-5 py-4 text-sm text-ink">
              <p className="font-semibold text-ink-subtle">{t('post.currentStep')}</p>
              <p className="mt-1 text-lg font-black">{step} / {STEPS.length}</p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="surface-panel p-5">
            <div className="space-y-4">
              {STEPS.map((item, index) => {
                const currentStep = index + 1;
                const isActive = currentStep === step;
                const isComplete = currentStep < step;

                return (
                  <div key={item.title} className={`rounded-[24px] border p-4 ${isActive ? "border-brand bg-brand-soft" : "border-outline bg-white"}`}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5">
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5 text-brand" />
                        ) : isActive ? (
                          <Circle className="h-5 w-5 fill-brand text-brand" />
                        ) : (
                          <Circle className="h-5 w-5 text-ink-subtle" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.16em] text-ink-subtle">{t('dashboard.step')} {currentStep}</p>
                        <h2 className="mt-1 text-base font-bold text-ink">{item.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-ink-muted">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="surface-card p-6 md:p-8">
            {error ? (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('post.labels.jobTitle')}</label>
                  <input
                    value={formData.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder={t('post.titlePlaceholder')}
                    className="field-shell w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('post.labels.category')}</label>
                  <CategorySelector
                    value={formData.category}
                    onChange={(categoryId) => updateField("category", categoryId)}
                    categories={categories}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('post.labels.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    rows={8}
                    placeholder={t('post.descPlaceholder')}
                    className="field-shell min-h-[220px] w-full resize-y"
                  />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">{t('post.labels.budgetType')}</label>
                    <select
                      value={formData.budgetType}
                      onChange={(event) => updateField("budgetType", event.target.value)}
                      className="field-shell w-full"
                    >
                      {BUDGET_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{getBudgetTypeLabel(type.value, t)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">{t('post.labels.duration')}</label>
                    <select
                      value={formData.duration}
                      onChange={(event) => updateField("duration", event.target.value)}
                      className="field-shell w-full"
                    >
                      <option value="">{t('post.selectDuration')}</option>
                      {DURATIONS.map((duration) => (
                        <option key={duration.value} value={duration.value}>{getDurationLabel(duration.value, t)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('post.labels.budget')}</label>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                    <CurrencyInput
                      value={formData.budget}
                      onValueChange={(value) => updateField("budget", value || "")}
                      decimalsLimit={2}
                      placeholder="0"
                      className="field-shell w-full"
                    />
                    <CurrencySelector
                      value={formData.budgetCurrency}
                      onChange={(currency) => updateField("budgetCurrency", currency)}
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">{t('post.labels.experience')}</label>
                    <select
                      value={formData.experienceLevel}
                      onChange={(event) => updateField("experienceLevel", event.target.value)}
                      className="field-shell w-full"
                    >
                      {EXPERIENCE_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>{getExperienceLevelLabel(level.value, t)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">{t('post.labels.skills')}</label>
                    <input
                      value={formData.skillsRequired}
                      onChange={(event) => updateField("skillsRequired", event.target.value)}
                      placeholder={t('post.skillsPlaceholder')}
                      className="field-shell w-full"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-6">
                <div className="rounded-[24px] bg-[#f7fbfc] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-ink-subtle">{t('post.workSetting')}</p>
                      <h2 className="mt-2 text-xl font-black text-ink">{formData.remote ? t('post.remoteFirst') : t('post.onSiteDelivery')}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField("remote", !formData.remote)}
                      className="secondary-cta"
                    >
                      {t('post.switchTo')} {formData.remote ? t('jobs.onSite') : t('jobDetail.remote')}
                    </button>
                  </div>
                </div>

                {!formData.remote ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">{t('jobDetail.location')}</label>
                    <LocationPicker
                      value={{ lat: formData.latitude ?? 0, lng: formData.longitude ?? 0, address: formData.location }}
                      onChange={({ lat, lng, address }) => {
                        setFormData((prev) => ({ ...prev, location: address, latitude: lat, longitude: lng }));
                      }}
                      addressPlaceholder={t('common.searchAddress')}
                    />
                  </div>
                ) : null}

                <div className="rounded-[28px] border border-outline bg-white p-6">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-ink-subtle">{t('common.review')}</p>
                  <dl className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">{t('common.title')}</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.title || t('dashboard.notSet')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">{t('jobs.category')}</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.category ? getCategoryName(formData.category, t) : t('dashboard.notSet')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">{t('jobDetail.budget')}</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.budget || "0"} {formData.budgetCurrency}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">{t('common.duration')}</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.duration ? getDurationLabel(formData.duration, t) : t('dashboard.notSet')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">{t('post.experienceLevelLabel')}</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{getExperienceLevelLabel(formData.experienceLevel, t)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">{t('post.deliveryLabel')}</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.remote ? t('jobDetail.remote') : formData.location || t('post.locationPending')}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-outline pt-6">
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                disabled={step === 1}
                className="secondary-cta disabled:opacity-50"
              >
                {t('common.previous')}
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={submitting}
                className="primary-cta disabled:opacity-60"
              >
                {step === STEPS.length ? (submitting ? t('post.publishing') : t('post.publishJob')) : t('common.continue')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
