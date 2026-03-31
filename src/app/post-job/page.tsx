"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CurrencyInput from "react-currency-input-field";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, MapPin } from "lucide-react";
import Footer from "@/components/Footer";
import { CurrencySelector } from "@/components/CurrencySelector";
import { BUDGET_TYPES, DURATIONS, EXPERIENCE_LEVELS } from "@/data/categories";
import { getCategoriesWithTranslations } from "@/lib/category-utils";
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
  remote: true,
};

const STEPS = [
  { title: "Job basics", description: "Define the role and the category." },
  { title: "Scope and budget", description: "Set budget, duration, and experience level." },
  { title: "Delivery details", description: "Add location details and review before posting." },
] as const;

export default function PostJobPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { firebaseToken } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<JobFormState>(INITIAL_FORM);

  const categories = useMemo(() => getCategoriesWithTranslations(t), [t]);

  const updateField = <K extends keyof JobFormState>(key: K, value: JobFormState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.title.trim() || !formData.category.trim() || !formData.description.trim()) {
        setError("Please complete the title, category, and description before continuing.");
        return false;
      }
    }

    if (step === 2) {
      if (!formData.budget || !formData.duration || !formData.experienceLevel) {
        setError("Please add budget, duration, and experience level.");
        return false;
      }
    }

    if (step === 3) {
      if (!formData.remote && !formData.location.trim()) {
        setError("Please provide a location for on-site work.");
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
      await api.createJob(
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
          location: formData.remote ? "Remote" : formData.location.trim(),
          remote: formData.remote,
        },
        firebaseToken
      );

      router.push("/my-jobs");
    } catch (err) {
      console.error("Error creating job:", err);
      setError(err instanceof Error ? err.message : "Failed to create job. Please try again.");
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
                Back to dashboard
              </Link>
              <span className="eyebrow mt-4">Post a job</span>
              <h1 className="mt-4 section-heading">Create a polished job listing</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
                This flow is aligned to the refined Stitch direction: lighter surfaces, clearer hierarchy, and a tighter review step before publishing.
              </p>
            </div>
            <div className="rounded-[24px] bg-[#eff7fa] px-5 py-4 text-sm text-ink">
              <p className="font-semibold text-ink-subtle">Current step</p>
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
                        <p className="text-sm font-black uppercase tracking-[0.16em] text-ink-subtle">Step {currentStep}</p>
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
                    placeholder="e.g. Mobile app QA support for a launch"
                    className="field-shell w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('post.labels.category')}</label>
                  <select
                    value={formData.category}
                    onChange={(event) => updateField("category", event.target.value)}
                    className="field-shell w-full"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">{t('post.labels.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    rows={8}
                    placeholder="Describe the work, outcomes, timeline, and any context a candidate should understand."
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
                        <option key={type.value} value={type.value}>{type.label}</option>
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
                      <option value="">Select duration</option>
                      {DURATIONS.map((duration) => (
                        <option key={duration.value} value={duration.value}>{duration.label}</option>
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
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">{t('post.labels.skills')}</label>
                    <input
                      value={formData.skillsRequired}
                      onChange={(event) => updateField("skillsRequired", event.target.value)}
                      placeholder="React, Node.js, UI QA"
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
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-ink-subtle">Work setting</p>
                      <h2 className="mt-2 text-xl font-black text-ink">{formData.remote ? "Remote-first" : "On-site delivery"}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField("remote", !formData.remote)}
                      className="secondary-cta"
                    >
                      Switch to {formData.remote ? "on-site" : "remote"}
                    </button>
                  </div>
                </div>

                {!formData.remote ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">Location</label>
                    <div className="field-shell flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-ink-subtle" />
                      <input
                        value={formData.location}
                        onChange={(event) => updateField("location", event.target.value)}
                        placeholder="Madrid, Spain"
                        className="w-full border-none bg-transparent outline-none"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[28px] border border-outline bg-white p-6">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-ink-subtle">Review</p>
                  <dl className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">Title</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.title || "Not set"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">Category</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.category || "Not set"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">Budget</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.budget || "0"} {formData.budgetCurrency}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">Duration</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.duration || "Not set"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">Experience level</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.experienceLevel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-subtle">Delivery</dt>
                      <dd className="mt-1 text-base font-semibold text-ink">{formData.remote ? "Remote" : formData.location || "Location pending"}</dd>
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
                Previous
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={submitting}
                className="primary-cta disabled:opacity-60"
              >
                {step === STEPS.length ? (submitting ? "Publishing..." : "Publish job") : "Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
