"use client";

import { useEffect, useState } from "react";
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
  LandingSkeleton,
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
function toCategories(landing: LandingResponse): CategoryItem[] {
  const { desktopItems, mobileItems } = landing.categories;
  const source = desktopItems.length > 0 ? desktopItems : mobileItems.map((item) => ({ ...item, countLabel: undefined }));
  return source.slice(0, MAX_CATEGORIES).map((item) => ({ ...item, icon: resolveCategoryIcon(item.iconKey) }));
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

export default function HomePage() {
  const { t, locale } = useTranslation();

  const [landing, setLanding] = useState<LandingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [locale, t]);

  if (loading) return <LandingSkeleton />;

  const categories = landing ? toCategories(landing) : [];
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
