"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CurrencyInput from "react-currency-input-field";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Loader2, Upload } from "lucide-react";
import { CurrencySelector } from "@/components/CurrencySelector";
import { CategorySelector } from "@/components/CategorySelector";
import { LocationPicker } from "@/components/ui/LocationPicker";
import { getCategoriesWithTranslations, getCategoryName } from "@/lib/category-utils";
import { useTranslation } from "@/lib/i18n";
import { api } from "@/lib/api";
import { uploadApi } from "@/lib/upload-api";
import { useAuth } from "@/context/AuthContext";

type ServiceFormState = {
  title: string;
  category: string;
  description: string;
  pricingModel: "HOURLY" | "FIXED";
  rate: string;
  rateCurrency: string;
  serviceRadiusKm: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string;
};

const INITIAL_FORM: ServiceFormState = {
  title: "",
  category: "",
  description: "",
  pricingModel: "HOURLY",
  rate: "",
  rateCurrency: "USD",
  serviceRadiusKm: "",
  location: "",
  latitude: null,
  longitude: null,
  imageUrl: "",
};

// Only HOURLY/FIXED are valid — the shared BUDGET_TYPES list also has a
// third "RANGE" option that this listing's pricingModel column can't store.
const PRICING_MODELS = [
  { value: "HOURLY", labelKey: "postOptions.budgetType.HOURLY" },
  { value: "FIXED", labelKey: "postOptions.budgetType.FIXED" },
] as const;

export default function PostServicePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { firebaseToken } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceFormState>(INITIAL_FORM);

  const categories = useMemo(() => getCategoriesWithTranslations(t), [t]);
  const STEPS = useMemo(
    () => [
      { title: t('postService.step1Title'), description: t('postService.step1Desc') },
      { title: t('postService.step2Title'), description: t('postService.step2Desc') },
      { title: t('postService.step3Title'), description: t('postService.step3Desc') },
    ],
    [t]
  );

  const updateField = <K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !firebaseToken) return;

    setUploadingImage(true);
    setError(null);
    try {
      const uploaded = await uploadApi.uploadImage(file, firebaseToken);
      updateField("imageUrl", uploaded.url);
    } catch (err) {
      console.error("Failed to upload image:", err);
      setError(err instanceof Error ? err.message : t('postService.uploadImageError'));
    } finally {
      setUploadingImage(false);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.title.trim() || !formData.category.trim() || !formData.description.trim()) {
        setError(t('post.validationStep1'));
        return false;
      }
    }

    if (step === 2) {
      if (!formData.rate || Number(formData.rate) <= 0) {
        setError(t('postService.validationRate'));
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
      const location = formData.location.trim() || null;

      await api.createListing(
        {
          title: formData.title.trim(),
          category: formData.category,
          description: formData.description.trim(),
          pricingModel: formData.pricingModel,
          rate: Number(formData.rate),
          rateCurrency: formData.rateCurrency,
          serviceRadiusKm: formData.serviceRadiusKm ? Number(formData.serviceRadiusKm) : null,
          location,
          latitude: location ? formData.latitude : null,
          longitude: location ? formData.longitude : null,
          availability: "AVAILABLE",
          imageUrl: formData.imageUrl || null,
        },
        firebaseToken
      );

      router.push("/my-listings");
    } catch (err) {
      console.error("Error creating listing:", err);
      setError(err instanceof Error ? err.message : t('postService.createError'));
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
              <span className="eyebrow mt-4">{t('postService.eyebrow')}</span>
              <h1 className="mt-4 section-heading">{t('postService.heading')}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
                {t('postService.subtitle')}
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
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('postService.serviceTitleLabel')}</label>
                  <input
                    value={formData.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder={t('postService.titlePlaceholder')}
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
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('postService.descriptionLabel')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    rows={8}
                    placeholder={t('postService.descPlaceholder')}
                    className="field-shell min-h-[220px] w-full resize-y"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('postService.photoLabel')}</label>
                  {formData.imageUrl ? (
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={formData.imageUrl} alt={t('postService.previewAlt')} className="h-20 w-20 rounded-2xl object-cover" />
                      <button type="button" onClick={() => updateField("imageUrl", "")} className="secondary-cta">
                        {t('myListings.remove')}
                      </button>
                    </div>
                  ) : (
                    <label className="field-shell flex w-full cursor-pointer items-center justify-center gap-2 py-6 text-sm text-ink-muted">
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploadingImage ? t('profile.uploading') : t('postService.uploadPhoto')}
                      <input type="file" accept="image/*" className="sr-only" onChange={handleImageChange} disabled={uploadingImage} />
                    </label>
                  )}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('postService.pricingModelLabel')}</label>
                  <select
                    value={formData.pricingModel}
                    onChange={(event) => updateField("pricingModel", event.target.value as "HOURLY" | "FIXED")}
                    className="field-shell w-full"
                  >
                    {PRICING_MODELS.map((type) => (
                      <option key={type.value} value={type.value}>{t(type.labelKey)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('common.rate')}</label>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                    <CurrencyInput
                      value={formData.rate}
                      onValueChange={(value) => updateField("rate", value || "")}
                      decimalsLimit={2}
                      placeholder="0"
                      className="field-shell w-full"
                    />
                    <CurrencySelector
                      value={formData.rateCurrency}
                      onChange={(currency) => updateField("rateCurrency", currency)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('postService.serviceRadiusLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.serviceRadiusKm}
                    onChange={(event) => updateField("serviceRadiusKm", event.target.value)}
                    placeholder={t('postService.radiusPlaceholder')}
                    className="field-shell w-full"
                  />
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('postService.baseLocationLabel')}</label>
                  <LocationPicker
                    value={{ lat: formData.latitude ?? 0, lng: formData.longitude ?? 0, address: formData.location }}
                    onChange={({ lat, lng, address }) => {
                      setFormData((prev) => ({ ...prev, location: address, latitude: lat, longitude: lng }));
                    }}
                    addressPlaceholder={t('common.searchAddress')}
                  />
                </div>

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
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">{t('common.rate')}</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">
                        {formData.rate || "0"} {formData.rateCurrency} {formData.pricingModel === "HOURLY" ? t('jobDetail.hourly') : t('jobDetail.fixed')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">{t('postService.serviceRadiusReview')}</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.serviceRadiusKm ? `${formData.serviceRadiusKm} km` : t('dashboard.notSet')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">{t('jobDetail.location')}</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.location || t('dashboard.notSet')}</dd>
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
                {step === STEPS.length ? (submitting ? t('post.publishing') : t('postService.publishService')) : t('common.continue')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
