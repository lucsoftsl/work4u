"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin, Search, SearchX, SlidersHorizontal } from "lucide-react";
import { WorkerListingCard } from "@/components/WorkerListingCard";
import { useTranslation } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { WorkerListing } from "@/api/types";
import { errorMessage } from "@/lib/http";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/QueryState";
import { WorkerFilterPanel, WorkerFiltersSheet } from "./workers-filters";

const LISTINGS_PER_PAGE = 8;

type SortKey = "newest" | "rating";
const SORT_KEYS: readonly SortKey[] = ["newest", "rating"];

// Every filter lives in the URL so results are shareable and survive reloads.
function readFilters(params: URLSearchParams) {
  const sortParam = params.get("sort") as SortKey | null;
  const page = Number(params.get("page"));
  return {
    keywords: params.get("keywords") ?? "",
    location: params.get("location") ?? "",
    categories: (params.get("category") ?? "").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean),
    availableOnly: params.get("availability") === "AVAILABLE",
    sort: sortParam && SORT_KEYS.includes(sortParam) ? sortParam : ("newest" as SortKey),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

const INPUT =
  "w-full min-h-[48px] rounded-control border border-line-strong bg-surface py-2.5 pl-10 pr-3 text-body text-ink placeholder:text-ink-subtle " +
  "transition-colors duration-fast hover:border-ink-muted focus:border-primary focus:outline-none focus:shadow-focus";

export default function WorkersPageContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => readFilters(new URLSearchParams(searchParams.toString())), [searchParams]);

  const [listings, setListings] = useState<WorkerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Only search, location and a single category go to the API; the rest filters client-side.
  const apiCategory = filters.categories.length === 1 ? filters.categories[0] : "";
  const fetchKey = JSON.stringify([filters.keywords, filters.location, apiCategory]);

  useEffect(() => {
    const [keywords, location, category] = JSON.parse(fetchKey) as [string, string, string];
    let isActive = true;
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data =
          keywords || location
            ? await api.searchListings({ keywords: keywords || undefined, location: location || undefined })
            : await api.listListings(category ? { category } : undefined);
        if (isActive) setListings(data);
      } catch (error) {
        console.error("Failed to load worker listings:", error);
        if (!isActive) return;
        setListings([]);
        setLoadError(errorMessage(error, t("common.loadError")));
      } finally {
        if (isActive) setLoading(false);
      }
    };
    void load();
    return () => {
      isActive = false;
    };
  }, [fetchKey, reloadKey, t]);

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in patch)) next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `/workers?${qs}` : "/workers", { scroll: false });
  };

  const visibleListings = useMemo(() => {
    const filtered = listings.filter((listing) => {
      if (filters.categories.length > 0 && !filters.categories.includes(listing.category.toLowerCase())) return false;
      if (filters.availableOnly && listing.availability !== "AVAILABLE") return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (filters.sort === "rating") return (b.worker?.rating ?? 0) - (a.worker?.rating ?? 0);
      return String(b.dateTimeCreated).localeCompare(String(a.dateTimeCreated));
    });
  }, [listings, filters]);

  const totalPages = Math.max(1, Math.ceil(visibleListings.length / LISTINGS_PER_PAGE));
  const currentPage = Math.min(filters.page, totalPages);
  const pageListings = visibleListings.slice((currentPage - 1) * LISTINGS_PER_PAGE, currentPage * LISTINGS_PER_PAGE);

  const activeFilterCount = filters.categories.length + (filters.availableOnly ? 1 : 0);
  const hasNarrowing = activeFilterCount > 0 || Boolean(filters.keywords) || Boolean(filters.location);

  const toggleCategory = (id: string) => {
    const next = filters.categories.includes(id) ? filters.categories.filter((c) => c !== id) : [...filters.categories, id];
    updateParams({ category: next.join(",") || null });
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateParams({
      keywords: String(data.get("keywords") ?? "").trim() || null,
      location: String(data.get("location") ?? "").trim() || null,
    });
  };

  const clearFilters = () => router.replace("/workers", { scroll: false });

  const panel = (
    <WorkerFilterPanel
      categories={filters.categories}
      availableOnly={filters.availableOnly}
      onToggleCategory={toggleCategory}
      onAvailableOnly={(value) => updateParams({ availability: value ? "AVAILABLE" : null })}
    />
  );

  const resultLabel =
    visibleListings.length === 1
      ? t("workers.resultsCountOne")
      : t("workers.resultsCount").replace("{count}", String(visibleListings.length));

  return (
    <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-h1 text-ink">{t("workers.findPeople")}</h1>
          <p className="mt-2 max-w-2xl text-body text-ink-muted">{t("workers.subtitle")}</p>
        </div>
        {user ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/my-listings" className={buttonClasses("secondary")}>
              {t("workers.myServices")}
            </Link>
            <Link href="/post-service" className={buttonClasses("primary")}>
              {t("myListings.postService")}
            </Link>
          </div>
        ) : null}
      </div>

      <form
        role="search"
        aria-label={t("workers.searchAria")}
        onSubmit={handleSearch}
        key={`${filters.keywords}|${filters.location}`}
        className="mt-6 grid gap-3 rounded-card border border-line bg-surface p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:p-5"
      >
        <div className="relative min-w-0">
          <label htmlFor="workers-keywords" className="sr-only">
            {t("workers.searchKeywordsLabel")}
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            id="workers-keywords"
            name="keywords"
            type="search"
            defaultValue={filters.keywords}
            placeholder={t("workers.searchKeywordsPlaceholder")}
            className={INPUT}
          />
        </div>
        <div className="relative min-w-0">
          <label htmlFor="workers-location" className="sr-only">
            {t("jobs.searchLocationLabel")}
          </label>
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            id="workers-location"
            name="location"
            type="text"
            autoComplete="address-level2"
            defaultValue={filters.location}
            placeholder={t("jobs.searchLocationPlaceholder")}
            className={INPUT}
          />
        </div>
        <Button type="submit" className="min-h-[48px] w-full md:w-auto">
          <Search className="h-4 w-4" aria-hidden="true" />
          {t("jobs.searchSubmit")}
        </Button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside aria-labelledby="worker-filters-heading" className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+1rem)] rounded-card border border-line bg-surface p-5">
            <div className="mb-4 flex min-h-[44px] items-center justify-between gap-2 border-b border-line pb-3">
              <h2 id="worker-filters-heading" className="text-label uppercase tracking-[0.06em] text-ink">
                {t("jobs.filters")}
              </h2>
              {activeFilterCount > 0 ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t("common.clear")}
                </Button>
              ) : null}
            </div>
            {panel}
          </div>
        </aside>

        <section aria-labelledby="worker-results-heading" className="min-w-0">
          <div className="mb-4 grid grid-cols-2 items-end gap-3 rounded-card border border-line bg-surface p-3 md:p-4 lg:flex lg:justify-between">
            <h2 id="worker-results-heading" aria-live="polite" className="col-span-2 text-label text-ink lg:col-span-1 lg:self-center">
              {loading ? t("workers.loading") : resultLabel}
            </h2>
            <Button variant="secondary" className="min-h-[48px] w-full lg:hidden" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
              <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {t("jobs.filters")}
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </span>
            </Button>
            <Select
              label={t("jobs.sortLabel")}
              value={filters.sort}
              onChange={(event) => updateParams({ sort: event.target.value === "newest" ? null : event.target.value })}
              wrapperClassName="min-w-0 lg:flex lg:items-center lg:gap-3 lg:space-y-0"
              className="min-w-0 lg:w-56"
            >
              <option value="newest">{t("jobs.sort.newest")}</option>
              <option value="rating">{t("workers.sort.rating")}</option>
            </Select>
          </div>

          {loading ? (
            <ListSkeleton rows={4} label={t("workers.loading")} />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={() => setReloadKey((n) => n + 1)} />
          ) : pageListings.length > 0 ? (
            <>
              <ul className="space-y-3">
                {pageListings.map((listing) => (
                  <li key={listing.id}>
                    <WorkerListingCard listing={listing} />
                  </li>
                ))}
              </ul>

              {totalPages > 1 ? (
                <nav aria-label={t("jobs.pagination")} className="mt-6 flex items-center justify-between gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => updateParams({ page: String(currentPage - 1) })}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span className="max-sm:sr-only">{t("common.previous")}</span>
                  </Button>
                  <p className="text-label font-normal tabular text-ink-muted">
                    {t("jobs.pageOf").replace("{page}", String(currentPage)).replace("{total}", String(totalPages))}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => updateParams({ page: String(currentPage + 1) })}
                    disabled={currentPage === totalPages}
                  >
                    <span className="max-sm:sr-only">{t("common.next")}</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </nav>
              ) : null}
            </>
          ) : hasNarrowing ? (
            <EmptyState
              icon={SearchX}
              title={t("workers.noMatching")}
              description={t("jobs.tryBroaden")}
              action={
                <Button variant="primary" onClick={clearFilters}>
                  {t("jobs.clearFilters")}
                </Button>
              }
            />
          ) : (
            <EmptyState title={t("workers.noMatching")} description={t("workers.emptyDesc")} />
          )}
        </section>
      </div>

      <div className="lg:hidden">
        <WorkerFiltersSheet open={sheetOpen} onClose={() => setSheetOpen(false)} resultCount={visibleListings.length}>
          {panel}
        </WorkerFiltersSheet>
      </div>
    </div>
  );
}
