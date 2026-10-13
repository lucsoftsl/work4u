"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { useTranslation } from "@/lib/i18n";
import { getCategoriesWithTranslations } from "@/lib/category-utils";
import { api } from "@/lib/api";
import type { Job } from "@/api/types";
import { errorMessage } from "@/lib/http";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Checkbox, Select } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/QueryState";

const JOBS_PER_PAGE = 8;
const CATEGORIES_COLLAPSED = 6;

type SortKey = "newest" | "budget" | "applicants";
type BudgetFilter = "any" | "fixed" | "hourly";

const SORT_KEYS: readonly SortKey[] = ["newest", "budget", "applicants"];

// Every filter lives in the URL so results are shareable and survive reloads.
function readFilters(params: URLSearchParams) {
  const sortParam = params.get("sort") as SortKey | null;
  const typeParam = params.get("type");
  const page = Number(params.get("page"));
  return {
    keywords: params.get("keywords") ?? "",
    location: params.get("location") ?? "",
    categories: (params.get("category") ?? "").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean),
    budgetType: (typeParam === "fixed" || typeParam === "hourly" ? typeParam : "any") as BudgetFilter,
    openOnly: params.get("open") !== "0",
    sort: sortParam && SORT_KEYS.includes(sortParam) ? sortParam : ("newest" as SortKey),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

const INPUT =
  "w-full min-h-[48px] rounded-control border border-line-strong bg-surface py-2.5 pl-10 pr-3 text-body text-ink placeholder:text-ink-subtle " +
  "transition-colors duration-fast hover:border-ink-muted focus:border-primary focus:outline-none focus:shadow-focus";

interface FilterPanelProps {
  categories: string[];
  budgetType: BudgetFilter;
  openOnly: boolean;
  onToggleCategory: (id: string) => void;
  onBudgetType: (value: BudgetFilter) => void;
  onOpenOnly: (value: boolean) => void;
}

function FilterPanel({ categories, budgetType, openOnly, onToggleCategory, onBudgetType, onOpenOnly }: FilterPanelProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const all = getCategoriesWithTranslations(t);
  // Selected categories always stay visible, even when the list is collapsed.
  const shown = showAll ? all : all.filter((c, i) => i < CATEGORIES_COLLAPSED || categories.includes(c.id));

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-micro uppercase text-ink-muted">{t("jobs.category")}</legend>
        <div className="space-y-0.5">
          {shown.map((cat) => (
            <Checkbox key={cat.id} label={cat.name} checked={categories.includes(cat.id)} onChange={() => onToggleCategory(cat.id)} />
          ))}
        </div>
        {all.length > CATEGORIES_COLLAPSED ? (
          <Button variant="ghost" size="sm" className="-ml-3 mt-1" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
            {showAll ? t("common.showLess") : t("common.showMore")}
          </Button>
        ) : null}
      </fieldset>

      <div className="border-t border-line pt-5">
        <p className="mb-2 text-micro uppercase text-ink-muted">{t("jobs.budgetType")}</p>
        <SegmentedControl
          label={t("jobs.budgetType")}
          value={budgetType}
          onChange={onBudgetType}
          className="flex w-full"
          options={[
            { value: "any", label: t("jobs.budgetAny") },
            { value: "fixed", label: t("jobs.budgetFixed") },
            { value: "hourly", label: t("jobs.budgetHourly") },
          ]}
        />
      </div>

      <div className="border-t border-line pt-3">
        <Checkbox label={t("jobs.openOnly")} checked={openOnly} onChange={(e) => onOpenOnly(e.target.checked)} />
      </div>
    </div>
  );
}

function FiltersSheet({ open, onClose, resultCount, children }: { open: boolean; onClose: () => void; resultCount: number; children: ReactNode }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="job-filters-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="mx-auto mb-0 mt-auto max-h-[85dvh] w-full max-w-2xl rounded-t-sheet bg-surface p-0 text-ink shadow-raised backdrop:bg-ink/40 motion-safe:animate-sheet-up"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <h2 id="job-filters-title" className="font-display text-h3 text-ink">
            {t("jobs.filters")}
          </h2>
          <Button variant="ghost" size="icon" aria-label={t("common.close")} onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        <div className="border-t border-line p-4">
          <Button size="lg" className="w-full" onClick={onClose}>
            {t("jobs.showResults").replace("{count}", String(resultCount))}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

export default function JobsPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => readFilters(new URLSearchParams(searchParams.toString())), [searchParams]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Only search, location and a single category go to the API; everything else filters client-side.
  const apiCategory = filters.categories.length === 1 ? filters.categories[0] : "";
  const fetchKey = `${filters.keywords}|${filters.location}|${apiCategory}`;

  useEffect(() => {
    const [keywords, location, category] = fetchKey.split("|");
    let isActive = true;
    const loadJobs = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data =
          keywords || location
            ? await api.searchJobs({ keywords: keywords || undefined, location: location || undefined })
            : await api.listJobs(category ? { category } : undefined);
        if (isActive) setJobs(data);
      } catch (error) {
        console.error("Failed to load jobs:", error);
        if (!isActive) return;
        setJobs([]);
        setLoadError(errorMessage(error, t("common.loadError")));
      } finally {
        if (isActive) setLoading(false);
      }
    };
    void loadJobs();
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
    router.replace(qs ? `/jobs?${qs}` : "/jobs", { scroll: false });
  };

  const visibleJobs = useMemo(() => {
    const filtered = jobs.filter((job) => {
      if (filters.categories.length > 0 && !filters.categories.includes(job.category.toLowerCase())) return false;
      if (filters.budgetType === "fixed" && job.budgetType !== "FIXED") return false;
      if (filters.budgetType === "hourly" && job.budgetType !== "HOURLY") return false;
      if (filters.openOnly && job.lifecycleStatus && job.lifecycleStatus !== "OPEN") return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (filters.sort === "budget") return b.budget - a.budget;
      if (filters.sort === "applicants") return b.applicants - a.applicants;
      return String(b.dateTimeCreated).localeCompare(String(a.dateTimeCreated));
    });
  }, [jobs, filters]);

  const totalPages = Math.max(1, Math.ceil(visibleJobs.length / JOBS_PER_PAGE));
  const currentPage = Math.min(filters.page, totalPages);
  const pageJobs = visibleJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE);

  const activeFilterCount = filters.categories.length + (filters.budgetType !== "any" ? 1 : 0) + (filters.openOnly ? 1 : 0);
  const hasNarrowing =
    filters.categories.length > 0 || filters.budgetType !== "any" || Boolean(filters.keywords) || Boolean(filters.location);

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

  const clearFilters = () => router.replace("/jobs", { scroll: false });

  const panel = (
    <FilterPanel
      categories={filters.categories}
      budgetType={filters.budgetType}
      openOnly={filters.openOnly}
      onToggleCategory={toggleCategory}
      onBudgetType={(value) => updateParams({ type: value === "any" ? null : value })}
      onOpenOnly={(value) => updateParams({ open: value ? null : "0" })}
    />
  );

  const resultLabel =
    visibleJobs.length === 1 ? t("jobs.resultsCountOne") : t("jobs.resultsCount").replace("{count}", String(visibleJobs.length));

  return (
    <div className="mx-auto w-full max-w-content px-4 py-6 md:px-6 md:py-10">
      <h1 className="font-display text-h1 text-ink">{t("jobs.heading")}</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-muted">{t("jobs.lede")}</p>

      <form
        role="search"
        aria-label={t("jobs.searchAria")}
        onSubmit={handleSearch}
        key={`${filters.keywords}|${filters.location}`}
        className="mt-6 grid gap-3 rounded-card border border-line bg-surface p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:p-5"
      >
        <div className="relative min-w-0">
          <label htmlFor="jobs-keywords" className="sr-only">
            {t("jobs.searchKeywordsLabel")}
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            id="jobs-keywords"
            name="keywords"
            type="search"
            defaultValue={filters.keywords}
            placeholder={t("jobs.searchKeywordsPlaceholder")}
            className={INPUT}
          />
        </div>
        <div className="relative min-w-0">
          <label htmlFor="jobs-location" className="sr-only">
            {t("jobs.searchLocationLabel")}
          </label>
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            id="jobs-location"
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
        <aside aria-labelledby="job-filters-heading" className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+1rem)] rounded-card border border-line bg-surface p-5">
            <div className="mb-4 flex min-h-[44px] items-center justify-between gap-2 border-b border-line pb-3">
              <h2 id="job-filters-heading" className="text-label uppercase tracking-[0.06em] text-ink">
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

        <section aria-labelledby="job-results-heading" className="min-w-0">
          <div className="mb-4 grid grid-cols-2 items-end gap-3 rounded-card border border-line bg-surface p-3 md:p-4 lg:flex lg:justify-between">
            <h2 id="job-results-heading" aria-live="polite" className="col-span-2 text-label text-ink lg:col-span-1 lg:self-center">
              {loading ? t("jobs.loading") : resultLabel}
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
              <option value="budget">{t("jobs.sort.budget")}</option>
              <option value="applicants">{t("jobs.sort.applicants")}</option>
            </Select>
          </div>

          {loading ? (
            <ListSkeleton rows={4} label={t("jobs.loading")} />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={() => setReloadKey((n) => n + 1)} />
          ) : pageJobs.length > 0 ? (
            <>
              <ul className="space-y-3">
                {pageJobs.map((job) => (
                  <li key={job.id}>
                    <JobCard job={job} />
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
          ) : hasNarrowing || !filters.openOnly ? (
            <EmptyState
              icon={SearchX}
              title={t("jobs.emptyFilteredTitle")}
              description={t("jobs.tryBroaden")}
              action={
                <Button variant="primary" onClick={clearFilters}>
                  {t("jobs.clearFilters")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={t("jobs.noJobs")}
              description={t("jobs.emptyDesc")}
              action={
                <Link href="/post-job" className={buttonClasses("primary")}>
                  {t("nav.postJob")}
                </Link>
              }
            />
          )}
        </section>
      </div>

      <div className="lg:hidden">
        <FiltersSheet open={sheetOpen} onClose={() => setSheetOpen(false)} resultCount={visibleJobs.length}>
          {panel}
        </FiltersSheet>
      </div>
    </div>
  );
}
