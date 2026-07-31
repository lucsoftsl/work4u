"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { useTranslation } from "@/lib/i18n";
import { getCategoriesWithTranslations } from "@/lib/category-utils";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Job } from "@/api/types";

const JOBS_PER_PAGE = 8;

export default function JobsPageContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"newest" | "budget" | "applicants">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);

        const keywords = searchParams.get("keywords");
        const location = searchParams.get("location");
        const category = searchParams.get("category");

        if (keywords || location) {
          setJobs(await api.searchJobs({ keywords: keywords || undefined, location: location || undefined }));
        } else if (category) {
          setJobs(await api.listJobs({ category }));
        } else {
          setJobs(await api.listJobs());
        }
      } catch (error) {
        console.error("Failed to load jobs:", error);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    void loadJobs();
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategories, sortBy]);

  const filteredJobs = selectedCategories.length > 0
    ? jobs.filter((job) => selectedCategories.includes(job.category.toLowerCase()))
    : jobs;

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === "budget") return b.budget - a.budget;
    if (sortBy === "applicants") return b.applicants - a.applicants;
    return String(b.dateTimeCreated).localeCompare(String(a.dateTimeCreated));
  });

  const totalPages = Math.ceil(sortedJobs.length / JOBS_PER_PAGE);
  const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
  const allCategories = getCategoriesWithTranslations(t);
  const displayedCategories = showAllCategories ? allCategories : allCategories.slice(0, 5);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="surface-card overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
          <div>
            <span className="eyebrow">{t('common.marketplace')}</span>
            <h1 className="mt-5 section-heading">{t('jobs.title')}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
              {t('jobs.subtitle')}
            </p>
          </div>
          {user ? (
            <div className="flex flex-wrap gap-3">
              <Link href="/my-jobs" className="secondary-cta">{t('jobs.myJobs')}</Link>
              <Link href="/post-job" className="primary-cta">{t('nav.postJob')}</Link>
            </div>
          ) : null}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className="secondary-cta w-full justify-center gap-2 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t('jobs.filters')}
          </button>

          <div className={`${showFilters ? "mt-4 block" : "hidden"} surface-panel p-5 lg:mt-0 lg:block`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink">{t('jobs.filters')}</h2>
              {selectedCategories.length > 0 ? (
                <button className="text-xs font-bold text-brand" onClick={() => setSelectedCategories([])}>
                  {t('common.clear')}
                </button>
              ) : null}
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-bold text-ink">{t('jobs.category')}</h3>
              <div className="mt-4 space-y-3">
                {displayedCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-3 text-sm text-ink">
                    <input
                      type="checkbox"
                      value={cat.id}
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => handleCategoryChange(cat.id)}
                      className="h-4 w-4 rounded border-outline text-brand"
                    />
                    <span>{cat.name}</span>
                  </label>
                ))}
              </div>

              {allCategories.length > 5 ? (
                <button
                  onClick={() => setShowAllCategories((prev) => !prev)}
                  className="mt-4 text-sm font-semibold text-brand"
                >
                  {showAllCategories ? t('common.showLess') : t('common.showMore')}
                </button>
              ) : null}
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">
              {sortedJobs.length} {t('jobs.opportunitiesAvailable')}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-ink-muted">{t('jobs.sortBy')}</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as "newest" | "budget" | "applicants")}
                className="field-shell py-2"
              >
                <option value="newest">{t('jobs.sort.newest')}</option>
                <option value="budget">{t('jobs.sort.budget')}</option>
                <option value="applicants">{t('jobs.sort.applicants')}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="surface-panel p-10 text-center text-ink-muted">{t('jobs.loading')}</div>
          ) : paginatedJobs.length > 0 ? (
            <>
              <div className="grid gap-5">
                {paginatedJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-ink-muted">{t('common.page')} {currentPage} {t('common.of')} {totalPages}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="secondary-cta gap-2 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t('common.previous')}
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="secondary-cta gap-2 disabled:opacity-50"
                    >
                      {t('common.next')}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="surface-panel p-10 text-center">
              <p className="text-base font-semibold text-ink">{t('jobs.noMatching')}</p>
              <p className="mt-2 text-sm text-ink-muted">{t('jobs.tryBroaden')}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
