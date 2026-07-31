"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { WorkerListingCard } from "@/components/WorkerListingCard";
import { getCategoriesWithTranslations } from "@/lib/category-utils";
import { useTranslation } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { WorkerListing } from "@/api/types";

const LISTINGS_PER_PAGE = 8;

export default function WorkersPageContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<WorkerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const keywords = searchParams.get("keywords");
        const location = searchParams.get("location");
        const category = searchParams.get("category");

        if (keywords || location) {
          setListings(await api.searchListings({ keywords: keywords || undefined, location: location || undefined }));
        } else if (category) {
          setListings(await api.listListings({ category }));
        } else {
          setListings(await api.listListings());
        }
      } catch (error) {
        console.error("Failed to load worker listings:", error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategories]);

  const filteredListings = selectedCategories.length > 0
    ? listings.filter((listing) => selectedCategories.includes(listing.category.toLowerCase()))
    : listings;

  const totalPages = Math.ceil(filteredListings.length / LISTINGS_PER_PAGE);
  const startIndex = (currentPage - 1) * LISTINGS_PER_PAGE;
  const paginatedListings = filteredListings.slice(startIndex, startIndex + LISTINGS_PER_PAGE);
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
            <h1 className="mt-5 section-heading">{t('workers.findPeople')}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
              {t('workers.subtitle')}
            </p>
          </div>
          {user ? (
            <div className="flex flex-wrap gap-3">
              <Link href="/my-listings" className="secondary-cta">{t('workers.myServices')}</Link>
              <Link href="/post-service" className="primary-cta">{t('myListings.postService')}</Link>
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
              {filteredListings.length} {t('workers.servicesAvailable')}
            </p>
          </div>

          {loading ? (
            <div className="surface-panel p-10 text-center text-ink-muted">{t('workers.loading')}</div>
          ) : paginatedListings.length > 0 ? (
            <>
              <div className="grid gap-5">
                {paginatedListings.map((listing) => (
                  <WorkerListingCard key={listing.id} listing={listing} />
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
              <p className="text-base font-semibold text-ink">{t('workers.noMatching')}</p>
              <p className="mt-2 text-sm text-ink-muted">{t('jobs.tryBroaden')}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
