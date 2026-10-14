"use client";

import { useEffect, useRef, useState } from "react";
import { LandingFallback } from "@/components/landing/LandingFallback";
import { fetchLandingContent } from "@/lib/landing-api";
import { useTranslation } from "@/lib/i18n";
import type { LandingResponse } from "@/types/landing";
import {
  CategoryGrid,
  FeaturedHelperCard,
  HireWorkBand,
  JobRows,
  LandingSection,
  PersonaSearch,
  WorkerCards,
  type CategoryItem,
  type JobRowItem,
  type WorkerItem,
} from "@/components/landing/ui";
import { resolveCategoryIcon, resolveJobToneClass, resolveMobileTagClass } from "@/components/landing/icon-map";

const MAX_CATEGORIES = 6;
const MAX_JOBS = 4;
const MAX_WORKERS = 4;

// The landing payload has desktop and mobile variants of each list; one responsive list is
// rendered for every breakpoint, preferring the richer desktop items and falling back to mobile.
/** Real counts only (open jobs in the category); hidden when the API sends none or zero. Never the old static "1.2k+ gigs" copy. */
export function categoryCountLabel(jobCount: number | undefined, t: (key: string) => string): string | undefined {
  if (!jobCount || jobCount < 1) return undefined;
  return (jobCount === 1 ? t("landing.categories.openJobOne") : t("landing.categories.openJobs")).replace("{count}", String(jobCount));
}

function toCategories(landing: LandingResponse, t: (key: string) => string): CategoryItem[] {
  const { desktopItems, mobileItems } = landing.categories;
  const source: Array<{ slug: string; name: string; iconKey: string; jobCount?: number }> = desktopItems.length > 0 ? desktopItems : mobileItems;
  return source.slice(0, MAX_CATEGORIES).map((item) => ({ slug: item.slug, name: item.name, iconKey: item.iconKey, countLabel: categoryCountLabel(item.jobCount, t), icon: resolveCategoryIcon(item.iconKey) }));
}

function toJobRows(landing: LandingResponse): JobRowItem[] {
  if (landing.jobs.items.length > 0) {
    return landing.jobs.items.slice(0, MAX_JOBS).map((job) => ({
      id: job.id,
      title: job.title,
      budgetLabel: job.budgetLabel,
      locationLabel: job.locationLabel,
      tagLabel: job.typeLabel,
      tagClass: resolveJobToneClass(job.typeTone),
    }));
  }
  return landing.mobile.activeJobItems.slice(0, MAX_JOBS).map((job) => ({
    id: job.id,
    title: job.title,
    budgetLabel: job.budgetLabel,
    locationLabel: job.locationLabel,
    tagLabel: job.tagLabel,
    tagClass: resolveMobileTagClass(job.tagTone),
    metaLabel: job.applicantsLabel,
  }));
}

function toWorkers(landing: LandingResponse): WorkerItem[] {
  if (landing.professionals.items.length > 0) {
    return landing.professionals.items.slice(0, MAX_WORKERS).map((pro) => ({
      id: pro.id,
      name: pro.name,
      title: pro.title,
      rating: pro.rating,
      distanceLabel: pro.distanceLabel,
      tags: pro.tags,
    }));
  }
  return landing.mobile.topRatedItems.slice(0, MAX_WORKERS).map((pro) => ({
    id: pro.id,
    name: pro.name,
    rating: pro.rating,
    reviews: pro.reviews,
    distanceLabel: pro.distanceLabel,
  }));
}

/** `initialLanding`: the payload fetched on the server in `initialLang` (the URL language), so the first HTML has the real hero, categories, jobs and pros. */
export default function HomeClient({ initialLanding, initialLang = "en" }: { initialLanding: LandingResponse | null; initialLang?: string }) {
  const { t, locale } = useTranslation();

  const [landing, setLanding] = useState<LandingResponse | null>(initialLanding);
  const [loading, setLoading] = useState(!initialLanding);
  const [error, setError] = useState<string | null>(null);
  const skipFetch = useRef(Boolean(initialLanding)); // the server already provided the payload in the page language

  useEffect(() => {
    if (skipFetch.current && locale === initialLang) {
      skipFetch.current = false;
      return;
    }
    skipFetch.current = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchLandingContent(controller.signal, locale);
        setLanding(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : t("landing.loadError"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [locale, t, initialLang]);

  // No payload yet (server fetch failed / still loading): the static landing still has the real h1 and links, so crawlers and slow
  // connections never see an empty "Loading…" shell. The live payload replaces it when it arrives.
  if (loading) return <LandingFallback />;

  const categories = landing ? toCategories(landing, t) : [];
  const jobs = landing ? toJobRows(landing) : [];
  const workers = landing ? toWorkers(landing) : [];

  if (!landing || (categories.length === 0 && jobs.length === 0 && workers.length === 0)) {
    // Never show developer errors to visitors: fall back to a static landing built from translations.
    if (error) console.error("Landing content unavailable:", error);
    return <LandingFallback />;
  }

  const featured = landing.professionals.items[0];

  return (
    <div className="bg-canvas text-ink">
      <section aria-labelledby="landing-hero-title" className="mx-auto w-full max-w-content px-[var(--gutter)] py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="min-w-0 lg:col-span-7">
            <h1 id="landing-hero-title" className="font-display text-display text-ink">
              {landing.hero.desktopTitleLine1} <span className="block text-primary">{landing.hero.desktopTitleLine2}</span>
            </h1>
            <p className="mt-4 max-w-xl text-body-lg text-ink-muted">{landing.hero.desktopSubtitle}</p>
            <PersonaSearch className="mt-6 md:mt-8" />
          </div>
          <div className="hidden min-w-0 md:block md:max-w-xl lg:col-span-5 lg:max-w-none">
            <FeaturedHelperCard
              imageUrl={landing.hero.desktopImageUrl}
              helper={featured ? { name: featured.name, title: featured.title, rating: featured.rating } : undefined}
            />
          </div>
        </div>
      </section>

      {categories.length > 0 ? (
        <LandingSection
          id="landing-categories-title"
          title={landing.categories.desktopTitle}
          href={landing.actions.categoryViewAllHref}
          linkLabel={landing.categories.desktopViewAllLabel}
        >
          <CategoryGrid items={categories} />
        </LandingSection>
      ) : null}

      {jobs.length > 0 ? (
        <LandingSection
          id="landing-jobs-title"
          title={landing.jobs.title}
          subtitle={landing.jobs.subtitle}
          href={landing.actions.jobsViewAllHref}
          linkLabel={landing.jobs.viewAllLabel}
        >
          <JobRows items={jobs} />
        </LandingSection>
      ) : null}

      {workers.length > 0 ? (
        <LandingSection
          id="landing-workers-title"
          title={landing.professionals.title}
          subtitle={landing.professionals.subtitle}
          href="/workers"
          linkLabel={t("nav.findWorkers")}
        >
          <WorkerCards items={workers} />
        </LandingSection>
      ) : null}

      <HireWorkBand />
    </div>
  );
}
