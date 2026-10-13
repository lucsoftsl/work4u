"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Upload } from "lucide-react";
import { CategorySelector } from "@/components/CategorySelector";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { LocationPicker } from "@/components/ui/LocationPicker";
import { formatMoney } from "@/components/ui/MoneyPlate";
import { MoneyField } from "@/components/ui/MoneyField";
import { Skeleton } from "@/components/ui/QueryState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ReviewList, Stepper, WizardActionBar, WizardAlert } from "@/components/ui/Stepper";
import { getCategoriesWithTranslations, getCategoryName } from "@/lib/category-utils";
import { useTranslation } from "@/lib/i18n";
import { api } from "@/lib/api";
import { uploadApi } from "@/lib/upload-api";
import { currentPath, signInPath } from "@/lib/auth-redirect";
import { geocodeAddress } from "@/lib/geocode";
import { clearDraft, defaultCurrencyForLocale, firstErrorKey, focusFieldById, hasRealCoordinates, loadDraft, parsePositiveAmount, saveDraft } from "@/lib/wizard";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type PricingModel = "HOURLY" | "FIXED";

type ServiceFormState = {
  title: string;
  category: string;
  description: string;
  pricingModel: PricingModel;
  rate: string;
  /** Empty = follow the locale default until the user picks one. */
  rateCurrency: string;
  serviceRadiusKm: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string;
};

type FieldKey = "title" | "category" | "description" | "rate" | "radius";
type FieldErrors = Partial<Record<FieldKey, string>>;

const INITIAL_FORM: ServiceFormState = {
  title: "",
  category: "",
  description: "",
  pricingModel: "HOURLY",
  rate: "",
  rateCurrency: "",
  serviceRadiusKm: "",
  location: "",
  latitude: null,
  longitude: null,
  imageUrl: "",
};

const TOTAL_STEPS = 3;
const DRAFT_KEY = "w4u:draft:post-service";
const LOCATION_ID = "ps-location";
const IDS: Record<FieldKey, string> = {
  title: "ps-title",
  category: "ps-category",
  description: "ps-description",
  rate: "ps-rate",
  radius: "ps-radius",
};
const STEP_FIELDS: Record<number, readonly FieldKey[]> = {
  1: ["title", "category", "description"],
  2: ["rate", "radius"],
  3: [],
};

// Only HOURLY/FIXED are valid: the shared BUDGET_TYPES list also has a "RANGE" option
// that this listing's pricingModel column can't store.
const PRICING_MODELS = [
  { value: "HOURLY", labelKey: "postOptions.budgetType.HOURLY" },
  { value: "FIXED", labelKey: "postOptions.budgetType.FIXED" },
] as const;

export default function PostServicePage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { firebaseToken, loading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<ServiceFormState>(INITIAL_FORM);
  const [draftReady, setDraftReady] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepMounted = useRef(false);

  const currency = formData.rateCurrency || defaultCurrencyForLocale(locale);
  const categories = useMemo(() => getCategoriesWithTranslations(t), [t]);
  const steps = useMemo(
    () => [
      { title: t("postService.step1Title"), description: t("postService.step1Desc") },
      { title: t("postService.step2Title"), description: t("postService.step2Desc") },
      { title: t("postService.step3Title"), description: t("postService.step3Desc") },
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
    const draft = loadDraft<{ form: ServiceFormState; step: number }>(DRAFT_KEY);
    if (draft?.form) {
      setFormData({ ...INITIAL_FORM, ...draft.form });
      if (draft.step >= 1 && draft.step <= TOTAL_STEPS) setStep(draft.step);
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (draftReady) saveDraft(DRAFT_KEY, { form: formData, step });
  }, [draftReady, formData, step]);

  useEffect(() => {
    if (!stepMounted.current) {
      stepMounted.current = true;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const updateField = useCallback(<K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K], clears?: FieldKey) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (clears) setErrors((prev) => (prev[clears] ? { ...prev, [clears]: undefined } : prev));
  }, []);

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !firebaseToken) return;

    setUploadingImage(true);
    setFormError(null);
    try {
      const uploaded = await uploadApi.uploadImage(file, firebaseToken);
      updateField("imageUrl", uploaded.url);
    } catch (err) {
      console.error("Failed to upload image:", err);
      setFormError(err instanceof Error && err.message ? err.message : t("postService.uploadImageError"));
    } finally {
      setUploadingImage(false);
    }
  };

  const validateStep = (): boolean => {
    const next: FieldErrors = {};
    if (step === 1) {
      if (!formData.title.trim()) next.title = t("wizard.titleRequired");
      if (!formData.category.trim()) next.category = t("wizard.categoryRequired");
      if (!formData.description.trim()) next.description = t("wizard.descriptionRequired");
    } else if (step === 2) {
      if (parsePositiveAmount(formData.rate) === null) next.rate = t("postService.validationRate");
      if (formData.serviceRadiusKm && !(Number(formData.serviceRadiusKm) >= 0)) next.radius = t("wizard.radiusInvalid");
    }
    setErrors(next);
    const first = firstErrorKey(STEP_FIELDS[step], next);
    if (first) focusFieldById(IDS[first]);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || uploadingImage) return;
    setFormError(null);
    if (!validateStep()) return;

    if (step < TOTAL_STEPS) {
      setStep((prev) => prev + 1);
      return;
    }
    if (!firebaseToken) {
      router.push(signInPath(currentPath()));
      return;
    }

    setSubmitting(true);
    try {
      const location = formData.location.trim() || null;
      let latitude = formData.latitude;
      let longitude = formData.longitude;
      // A typed address without picked coordinates: try to geocode, never send 0,0.
      if (location && !hasRealCoordinates(latitude, longitude)) {
        const point = await geocodeAddress(location);
        latitude = point?.lat ?? null;
        longitude = point?.lng ?? null;
      }
      const hasCoords = Boolean(location) && hasRealCoordinates(latitude, longitude);

      await api.createListing(
        {
          title: formData.title.trim(),
          category: formData.category,
          description: formData.description.trim(),
          pricingModel: formData.pricingModel,
          rate: Number(formData.rate),
          rateCurrency: currency,
          serviceRadiusKm: formData.serviceRadiusKm ? Number(formData.serviceRadiusKm) : null,
          location,
          latitude: hasCoords ? latitude : null,
          longitude: hasCoords ? longitude : null,
          availability: "AVAILABLE",
          imageUrl: formData.imageUrl || null,
        },
        firebaseToken
      );

      clearDraft(DRAFT_KEY);
      router.push("/my-listings");
    } catch (err) {
      console.error("Error creating listing:", err);
      setFormError(err instanceof Error && err.message ? err.message : t("postService.createError"));
    } finally {
      setSubmitting(false);
    }
  };

  // Enter inside the address combobox picks a suggestion; it must never publish the listing.
  const blockEnterOnLocation = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && (event.target as HTMLElement).id === LOCATION_ID) event.preventDefault();
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

  const pricingLabel = formData.pricingModel === "HOURLY" ? t("jobDetail.hourly") : t("jobDetail.fixed");

  return (
    <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-6 md:py-10">
      <Link href="/dashboard" className="inline-flex min-h-[44px] items-center gap-2 text-label text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("nav.backToDashboard")}
      </Link>
      <h1 className="mt-1 font-display text-h1 text-ink">{t("postService.eyebrow")}</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-muted">{t("postService.subtitle")}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        <Stepper steps={steps} current={step} label={t("wizard.postServiceProgress")} className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start" />

        <form
          noValidate
          onSubmit={handleSubmit}
          aria-busy={submitting || undefined}
          className="min-w-0 md:rounded-card md:border md:border-line md:bg-surface md:p-8 md:shadow-stamp lg:max-w-[680px]"
        >
          {formError ? <WizardAlert tone="error" className="mb-6">{formError}</WizardAlert> : null}

          <h2 ref={headingRef} tabIndex={-1} className="font-display text-h2 text-ink focus:outline-none">
            {steps[step - 1].title}
          </h2>
          <p className="mb-6 mt-1 text-body text-ink-muted">{steps[step - 1].description}</p>

          {step === 1 ? (
            <div className="space-y-6">
              <Input
                id={IDS.title}
                label={t("postService.serviceTitleLabel")}
                required
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value, "title")}
                error={errors.title}
                placeholder={t("postService.titlePlaceholder")}
                autoComplete="off"
              />
              <CategorySelector
                id={IDS.category}
                label={t("post.labels.category").replace(/\s*\*\s*$/, "")}
                required
                value={formData.category}
                onChange={(categoryId) => updateField("category", categoryId, "category")}
                categories={categories}
                error={errors.category}
              />
              <Textarea
                id={IDS.description}
                label={t("postService.descriptionLabel")}
                required
                rows={8}
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value, "description")}
                error={errors.description}
                placeholder={t("postService.descPlaceholder")}
              />

              <div className="space-y-1.5">
                <span id="ps-photo-label" className="block text-label text-ink">{t("postService.photoLabel")}</span>
                {formData.imageUrl ? (
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.imageUrl} alt={t("postService.previewAlt")} width={80} height={80} className="h-20 w-20 rounded-card object-cover" />
                    <Button type="button" variant="secondary" onClick={() => updateField("imageUrl", "")}>
                      {t("myListings.remove")}
                    </Button>
                  </div>
                ) : (
                  <label
                    className={cn(
                      "flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed border-line-strong bg-surface px-3 py-6 text-label text-ink-muted transition-colors duration-fast hover:bg-sunken focus-within:shadow-focus",
                      uploadingImage && "cursor-wait opacity-70"
                    )}
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {uploadingImage ? t("profile.uploading") : t("postService.uploadPhoto")}
                    <input type="file" accept="image/*" className="sr-only" aria-labelledby="ps-photo-label" onChange={handleImageChange} disabled={uploadingImage} />
                  </label>
                )}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span aria-hidden="true" className="block text-label text-ink">{t("postService.pricingModelLabel")}</span>
                <SegmentedControl
                  label={t("postService.pricingModelLabel")}
                  value={formData.pricingModel}
                  onChange={(value) => updateField("pricingModel", value)}
                  options={PRICING_MODELS.map((model) => ({ value: model.value, label: t(model.labelKey) }))}
                  className="w-full [&>button]:flex-1"
                />
              </div>

              <MoneyField
                id={IDS.rate}
                label={t("common.rate")}
                currencyLabel={t("post.labels.currency")}
                required
                amount={formData.rate}
                onAmountChange={(value) => updateField("rate", value, "rate")}
                currency={currency}
                onCurrencyChange={(value) => updateField("rateCurrency", value)}
                error={errors.rate}
              />

              <Input
                id={IDS.radius}
                type="number"
                inputMode="numeric"
                min="0"
                label={t("postService.serviceRadiusLabel")}
                value={formData.serviceRadiusKm}
                onChange={(e) => updateField("serviceRadiusKm", e.target.value, "radius")}
                error={errors.radius}
                placeholder={t("postService.radiusPlaceholder")}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6" onKeyDown={blockEnterOnLocation}>
              <LocationPicker
                id={LOCATION_ID}
                label={t("postService.baseLocationLabel")}
                value={{ lat: formData.latitude ?? 0, lng: formData.longitude ?? 0, address: formData.location }}
                onChange={({ lat, lng, address }) => {
                  setFormData((prev) => ({
                    ...prev,
                    location: address,
                    latitude: hasRealCoordinates(lat, lng) ? lat : null,
                    longitude: hasRealCoordinates(lat, lng) ? lng : null,
                  }));
                }}
                addressPlaceholder={t("common.searchAddress")}
              />

              <ReviewList
                title={t("common.review")}
                items={[
                  { label: t("common.title"), value: formData.title || t("dashboard.notSet") },
                  { label: t("jobs.category"), value: formData.category ? getCategoryName(formData.category, t) : t("dashboard.notSet") },
                  {
                    label: t("common.rate"),
                    value: (
                      <span className="font-display tabular-nums text-money">
                        {formatMoney(Number(formData.rate) || 0, currency, locale)} {pricingLabel}
                      </span>
                    ),
                  },
                  { label: t("postService.serviceRadiusReview"), value: formData.serviceRadiusKm ? `${formData.serviceRadiusKm} km` : t("dashboard.notSet") },
                  { label: t("jobDetail.location"), value: formData.location || t("dashboard.notSet") },
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
            <Button type="submit" loading={submitting} disabled={uploadingImage} className="min-w-[8rem] flex-1 sm:flex-none">
              {step === TOTAL_STEPS ? (submitting ? t("post.publishing") : t("postService.publishService")) : t("common.continue")}
              {step < TOTAL_STEPS ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
            </Button>
          </WizardActionBar>
        </form>
      </div>
    </div>
  );
}
