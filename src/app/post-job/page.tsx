"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import Footer from "@/components/Footer";
import { CATEGORIES, BUDGET_TYPES, DURATIONS, EXPERIENCE_LEVELS } from "@/data/categories";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function PostJobPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    subCategory: "",
    budget: "",
    budgetType: "FIXED",
    duration: "",
    skillsRequired: "",
    experienceLevel: "BEGINNER",
    location: "",
    remote: true,
  });

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Submit job
      console.log("Submitting:", formData);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-4">
          <Link href="/jobs">
            <Button variant="outline" size="sm">
              <ChevronLeft size={18} />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{t('post.title')}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${s <= step
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600"
                  }`}
              >
                {s}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s, i) => (
              <div key={i} className="flex-1">
                {i < 3 && (
                  <div
                    className={`h-1 ${s < step ? "bg-blue-600" : "bg-gray-200"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Job Basics */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">{t('post.steps.basics')}</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('post.labels.jobTitle')}</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Website Design for E-commerce"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('post.labels.category')}</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('post.labels.description')}</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the work in detail..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 2: Job Details */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">{t('post.steps.details')}</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('post.labels.budgetType')}</label>
                  <select
                    name="budgetType"
                    value={formData.budgetType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {BUDGET_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('post.labels.budget')}</label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('post.labels.duration')}</label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select duration</option>
                  {DURATIONS.map((dur) => (
                    <option key={dur.value} value={dur.value}>
                      {dur.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('post.labels.experience')}</label>
                <select
                  name="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('post.labels.skills')}</label>
                <input
                  type="text"
                  name="skillsRequired"
                  value={formData.skillsRequired}
                  onChange={handleChange}
                  placeholder="e.g., React, Node.js, MongoDB (comma separated)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">{t('post.steps.location')}</h2>

              <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="remote"
                  checked={formData.remote}
                  onChange={handleChange}
                  className="w-5 h-5"
                />
                <div>
                  <p className="font-medium text-gray-900">{t('post.labels.remote')}</p>
                  <p className="text-sm text-gray-600">{t('post.labels.remoteDesc')}</p>
                </div>
              </label>

              {!formData.remote && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('post.labels.location')}</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder={t('post.labels.locationPlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">{t('post.steps.review')}</h2>

              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <div>
                  <p className="text-sm text-gray-600">{t('post.review.title')}</p>
                  <p className="font-bold text-gray-900">{formData.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('post.review.category')}</p>
                  <p className="font-bold text-gray-900">
                    {CATEGORIES.find((c) => c.id === formData.category)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('post.review.budget')}</p>
                  <p className="font-bold text-gray-900">
                    ${formData.budget} ({formData.budgetType})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('post.review.location')}</p>
                  <p className="font-bold text-gray-900">
                    {formData.remote ? t('post.review.remote') : formData.location}
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="checkbox" className="w-5 h-5 mt-1" required />
                <p className="text-sm text-gray-700">{t('post.review.confirm')}</p>
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                {t('post.actions.back')}
              </Button>
            )}
            <Button className="ml-auto">
              {step === 4 ? t('post.actions.post') : t('post.actions.continue')}
            </Button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
