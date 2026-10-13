"use client";

import Link from "next/link";
import Image from "next/image";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, Search, Star, type LucideIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/Button";
import { LedgerRow } from "@/components/ui/LedgerRow";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/QueryState";

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const CONTAINER = "mx-auto w-full max-w-content px-[var(--gutter)]";
const STRETCHED_LINK = "rounded-control after:absolute after:inset-0 after:content-[''] focus-visible:shadow-focus";

interface LandingSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
}

/** Hairline-separated landing band with an H2 header and an optional "view all" link. */
export function LandingSection({ id, title, subtitle, href, linkLabel, children }: LandingSectionProps) {
  return (
    <section aria-labelledby={id} className="border-t border-line">
      <div className={cn(CONTAINER, "py-12 md:py-16")}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <h2 id={id} className="font-display text-h2 text-ink">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-body text-ink-muted">{subtitle}</p> : null}
          </div>
          {href && linkLabel ? (
            <Link
              href={href}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-control text-label text-primary hover:underline"
            >
              {linkLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Hero search                                                         */
/* ------------------------------------------------------------------ */

type Persona = "hire" | "work";

/** Persona tabs + what/where search. Hire searches workers, work searches jobs; both pass keywords/location in the URL. */
export function PersonaSearch({ className, centered = false }: { className?: string; centered?: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [persona, setPersona] = useState<Persona>("hire");
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const whatId = useId();
  const whereId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (what.trim()) params.set("keywords", what.trim());
    if (where.trim()) params.set("location", where.trim());
    const base = persona === "hire" ? "/workers" : "/jobs";
    const query = params.toString();
    router.push(query ? `${base}?${query}` : base);
  };

  // Fields are borderless inside one bar; the bar itself carries the outline and the focus ring.
  const fieldClass =
    "relative flex min-w-0 items-center rounded-card transition-colors duration-fast hover:bg-canvas focus-within:bg-canvas";
  const inputClass =
    "h-12 w-full border-0 bg-transparent pl-11 pr-3 text-body text-ink placeholder:text-ink-subtle " +
    "focus:outline-none focus-visible:shadow-none [&::-webkit-search-cancel-button]:hidden";
  const iconClass = "pointer-events-none absolute left-3.5 h-5 w-5 text-ink-subtle";

  return (
    <div className={cn("w-full", centered && "flex flex-col items-center", className)}>
      <SegmentedControl<Persona>
        value={persona}
        onChange={setPersona}
        label={t("landing.persona.label")}
        tone="tabs"
        options={[
          { value: "hire", label: t("landing.persona.hire") },
          { value: "work", label: t("landing.persona.work") },
        ]}
      />
      <form
        role="search"
        onSubmit={handleSubmit}
        className={cn(
          "mt-2 flex w-full flex-col gap-1 rounded-sheet border border-line bg-surface p-1.5 text-left shadow-stamp",
          "transition-[border-color,box-shadow] duration-fast focus-within:border-primary focus-within:shadow-focus",
          "md:flex-row md:items-center md:gap-0"
        )}
      >
        <div className={cn(fieldClass, "md:flex-[3]")}>
          <label htmlFor={whatId} className="sr-only">
            {t("landing.search.whatLabel")}
          </label>
          <Search className={iconClass} aria-hidden="true" />
          <input
            id={whatId}
            type="search"
            value={what}
            onChange={(event) => setWhat(event.target.value)}
            placeholder={t(persona === "hire" ? "landing.search.hirePlaceholder" : "landing.search.workPlaceholder")}
            className={inputClass}
          />
        </div>
        <span aria-hidden="true" className="mx-3 h-px shrink-0 bg-line md:mx-1 md:h-7 md:w-px" />
        <div className={cn(fieldClass, "md:flex-[2]")}>
          <label htmlFor={whereId} className="sr-only">
            {t("landing.search.whereLabel")}
          </label>
          <MapPin className={iconClass} aria-hidden="true" />
          <input
            id={whereId}
            type="text"
            autoComplete="address-level2"
            value={where}
            onChange={(event) => setWhere(event.target.value)}
            placeholder={t("landing.search.wherePlaceholder")}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          className={buttonClasses("primary", "default", "mt-1 h-12 w-full shrink-0 rounded-[10px] md:ml-1.5 md:mt-0 md:w-auto md:px-6")}
        >
          {t(persona === "hire" ? "nav.findWorkers" : "nav.findJobs")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Featured helper card (hero, ≥ md)                                   */
/* ------------------------------------------------------------------ */

interface FeaturedHelper {
  name: string;
  title: string;
  rating: string;
}

export function FeaturedHelperCard({ imageUrl, helper }: { imageUrl: string; helper?: FeaturedHelper }) {
  const { t } = useTranslation();
  return (
    <article className="relative rounded-card border border-line bg-surface p-3 shadow-raised transition-[border-color] duration-fast hover:border-line-strong focus-within:border-line-strong">
      <div className="relative aspect-[4/3] overflow-hidden rounded-control bg-sunken">
        <Image src={imageUrl} alt="" fill unoptimized loading="eager" sizes="(min-width: 1024px) 40vw, 36rem" className="object-cover" />
      </div>
      <div className="px-2 pb-1 pt-3">
        <p className="text-micro uppercase text-ink-muted">{t("landing.featured.eyebrow")}</p>
        <p className="mt-1 font-display text-h3 text-ink">
          <Link href="/workers" className={STRETCHED_LINK}>
            {helper?.name ?? t("nav.findWorkers")}
          </Link>
        </p>
        {helper ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-label font-normal text-ink-muted">
            <span>{helper.title}</span>
            <Rating value={helper.rating} />
          </p>
        ) : null}
      </div>
    </article>
  );
}

function Rating({ value, reviews }: { value: string; reviews?: string }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1">
      <Star className="h-4 w-4 fill-money text-money" aria-hidden="true" />
      <span className="sr-only">{t("landing.ratingLabel")}</span>
      <span className="font-bold tabular text-ink">{value}</span>
      {reviews ? <span className="tabular">({reviews})</span> : null}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Categories: scroll strip < md, 3×2 at md, 6 across at lg            */
/* ------------------------------------------------------------------ */

export interface CategoryItem {
  slug: string;
  name: string;
  iconKey: string;
  icon: LucideIcon;
  countLabel?: string;
}

export function CategoryGrid({ items }: { items: CategoryItem[] }) {
  return (
    <div className="min-w-0 overflow-x-auto pb-2 md:overflow-visible md:pb-0">
      <ul className="flex gap-3 md:grid md:grid-cols-3 md:gap-4 lg:grid-cols-6">
        {items.map(({ slug, name, icon: Icon, countLabel }) => (
          <li key={slug} className="shrink-0 md:shrink">
            <Link
              href={`/jobs?category=${encodeURIComponent(slug)}`}
              className="flex min-h-[44px] items-center gap-2 rounded-card border border-line bg-surface px-3 py-1.5 text-ink transition-[box-shadow,border-color] duration-fast hover:border-line-strong hover:shadow-stamp md:h-full md:flex-col md:justify-center md:gap-2 md:p-5 md:text-center"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary md:h-11 md:w-11">
                <Icon className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
              </span>
              <span className="whitespace-nowrap font-display text-label md:whitespace-normal md:text-body md:font-semibold">{name}</span>
              {countLabel ? <span className="hidden text-caption text-ink-muted md:block">{countLabel}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Job rows                                                            */
/* ------------------------------------------------------------------ */

export interface JobRowItem {
  id: string;
  title: string;
  budgetLabel: string;
  locationLabel: string;
  tagLabel: string;
  tagClass: string;
  metaLabel?: string;
}

/** Budget arrives preformatted from the API, so it is shown on a money plate without re-formatting. */
function MoneyLabel({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-control border border-money/25 bg-money-soft px-3 py-1.5 font-display text-lg font-bold tabular text-money md:text-xl">
      {children}
    </span>
  );
}

export function JobRows({ items }: { items: JobRowItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((job) => (
        <li key={job.id}>
          <LedgerRow
            href={`/jobs/${encodeURIComponent(job.id)}`}
            title={job.title}
            eyebrow={
              <>
                <span className={cn("inline-flex items-center rounded-control px-2 py-0.5 font-bold", job.tagClass)}>{job.tagLabel}</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {job.locationLabel}
                </span>
              </>
            }
            meta={job.metaLabel ? <p>{job.metaLabel}</p> : undefined}
            aside={<MoneyLabel>{job.budgetLabel}</MoneyLabel>}
          />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Worker cards: horizontal scroller < md, 2-up at md, 4 at lg         */
/* ------------------------------------------------------------------ */

export interface WorkerItem {
  id: string;
  name: string;
  title?: string;
  rating: string;
  reviews?: string;
  distanceLabel: string;
  tags?: string[];
}

export function WorkerCards({ items }: { items: WorkerItem[] }) {
  return (
    <div className="min-w-0 overflow-x-auto pb-2 md:overflow-visible md:pb-0">
      <ul className="flex snap-x gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
        {items.map((worker) => (
          <li key={worker.id} className="w-[min(80vw,18rem)] shrink-0 snap-start md:w-auto">
            <article className="relative flex h-full flex-col rounded-card border border-line bg-surface p-5 transition-[box-shadow,border-color] duration-fast hover:border-line-strong hover:shadow-stamp focus-within:border-line-strong">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-h3 text-primary"
                >
                  {worker.name.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-h3 text-ink">
                    <Link href="/workers" className={STRETCHED_LINK}>
                      {worker.name}
                    </Link>
                  </h3>
                  {worker.title ? <p className="truncate text-label font-normal text-ink-muted">{worker.title}</p> : null}
                </div>
              </div>
              {worker.tags?.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {worker.tags.slice(0, 2).map((tag) => (
                    <li key={tag} className="rounded-control bg-sunken px-2 py-0.5 text-caption text-ink-muted">
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-auto pt-4">
                <div className="flex items-center justify-between gap-2 border-t border-line pt-3 text-label font-normal text-ink-muted">
                  <Rating value={worker.rating} reviews={worker.reviews} />
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{worker.distanceLabel}</span>
                  </span>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hire / work split band                                              */
/* ------------------------------------------------------------------ */

export function HireWorkBand() {
  const { t } = useTranslation();
  const panel = "flex flex-col items-start rounded-card p-6 md:rounded-none md:p-10";
  return (
    <div className="border-t border-line">
      <div className={cn(CONTAINER, "py-12 md:py-16")}>
        <div className="grid gap-4 md:grid-cols-2 md:gap-0 md:overflow-hidden md:rounded-card md:border md:border-line md:shadow-stamp">
          <div className={cn(panel, "bg-primary text-on-fill")}>
            <p className="text-micro uppercase">{t("landing.split.hireEyebrow")}</p>
            <h2 className="mt-2 font-display text-h2">{t("landing.split.hireTitle")}</h2>
            <p className="mt-3 max-w-md text-body">{t("landing.split.hireBody")}</p>
            <Link href="/post-job" className={buttonClasses("secondary", "default", "mt-6 border-surface")}>
              {t("home.ctaPostJob")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className={cn(panel, "border border-line bg-surface md:border-0")}>
            <p className="text-micro uppercase text-ink-muted">{t("landing.split.workEyebrow")}</p>
            <h2 className="mt-2 font-display text-h2 text-ink">{t("landing.split.workTitle")}</h2>
            <p className="mt-3 max-w-md text-body text-ink-muted">{t("landing.split.workBody")}</p>
            <Link href="/jobs" className={buttonClasses("primary", "default", "mt-6")}>
              {t("nav.findJobs")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* How it works (fallback only)                                        */
/* ------------------------------------------------------------------ */

const STEPS = [1, 2, 3] as const;

export function HowItWorksSteps() {
  const { t } = useTranslation();
  return (
    <>
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step} className="rounded-card border border-line bg-surface p-6">
            <span aria-hidden="true" className="font-display text-h3 tabular text-primary">
              {String(step).padStart(2, "0")}
            </span>
            <h3 className="mt-2 font-display text-h3 text-ink">{t(`how.step${step}Title`)}</h3>
            <p className="mt-2 text-body text-ink-muted">{t(`how.step${step}Desc`)}</p>
          </li>
        ))}
      </ol>
      <Link
        href="/how-it-works"
        className="mt-6 inline-flex min-h-[44px] items-center gap-1 rounded-control text-label text-primary hover:underline"
      >
        {t("nav.howItWorks")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton with the final geometry                            */
/* ------------------------------------------------------------------ */

export function LandingSkeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" className={cn(CONTAINER, "py-10 md:py-16")}>
      <span className="sr-only">{t("common.loading")}</span>
      <div aria-hidden="true">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="space-y-4 lg:col-span-7">
            <Skeleton className="h-10 w-4/5 md:h-14" />
            <Skeleton className="h-10 w-3/5 md:h-14" />
            <Skeleton className="h-11 w-full sm:w-80" />
            <Skeleton className="h-44 w-full md:h-16" />
          </div>
          <Skeleton className="hidden aspect-[4/3] w-full rounded-card md:block md:max-w-xl lg:col-span-5 lg:max-w-none" />
        </div>
        <div className="mt-12 flex gap-3 overflow-hidden md:grid md:grid-cols-3 md:gap-4 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-28 shrink-0 rounded-card md:h-32 md:w-auto" />
          ))}
        </div>
        <div className="mt-12 space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-start justify-between gap-4 rounded-card border border-line bg-surface p-4 md:p-6">
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-3/4" />
              </div>
              <Skeleton className="h-10 w-20 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
