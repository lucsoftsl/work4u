"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { MapPin, Star, TrendingUp, Users } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";
import { LedgerRow } from "@/components/ui/LedgerRow";
import { MoneyPlate } from "@/components/ui/MoneyPlate";
import { StatusChip } from "@/components/ui/StatusChip";
import type { JobLifecycleStatus } from "@/api/types";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "2 hours ago" / "yesterday" in the active locale; empty string for a missing or invalid date. */
export function formatTimeAgo(value: string | null | undefined, locale: string, now: number = Date.now()): string {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < HOUR) return rtf.format(Math.round(seconds / MINUTE), "minute");
  if (abs < DAY) return rtf.format(Math.round(seconds / HOUR), "hour");
  if (abs < WEEK) return rtf.format(Math.round(seconds / DAY), "day");
  return new Date(time).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

export interface JobCardJob {
  id: string;
  /** `{slug}-{id}` URL segment when known (public API); falls back to the id. */
  canonicalPath?: string;
  /** Poster display name when the full poster block is not loaded yet. */
  employerName?: string;
  title: string;
  category: string;
  budget: number;
  budgetType: "FIXED" | "HOURLY";
  budgetCurrency: string;
  location: string;
  remote: boolean;
  /** Unknown until the full job is loaded (server-rendered seeds do not have it). */
  applicants?: number;
  boosted?: boolean;
  dateTimeCreated?: string;
  lifecycleStatus?: JobLifecycleStatus;
  createdBy?: {
    userId: string;
    name: string;
    image?: string | null;
    rating: number;
    reviews: number;
  };
}

interface JobCardProps {
  headingLevel?: "h2" | "h3";
  job: JobCardJob;
  /** Owner variant: show the lifecycle chip. */
  showStatus?: boolean;
  /** Owner / worker actions rendered as siblings of the row link. */
  actions?: ReactNode;
}

/** Small poster trust line: avatar, name, rating with count, or "New on work4u" when there are no reviews. */
export function PosterMiniTrust({ name, image, rating, reviews }: { name: string; image?: string | null; rating: number; reviews: number }) {
  const { t } = useTranslation();
  return (
    <span className="flex min-w-0 items-center gap-x-2">
      {image ? (
        <Image src={image} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-micro text-primary">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-bold text-ink sm:flex-none">{name}</span>
      {reviews > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-1 tabular text-money">
          <Star className="h-3.5 w-3.5 fill-money" aria-hidden="true" />
          <span className="font-bold">{rating.toFixed(1)}</span>
          <span aria-hidden="true">({reviews})</span>
          <span className="sr-only">{t("jobs.reviewsCountSr").replace("{count}", String(reviews))}</span>
        </span>
      ) : (
        <span className="shrink-0 whitespace-nowrap rounded-control bg-info-soft px-1.5 text-micro text-info">{t("jobs.newOnWork4u")}</span>
      )}
    </span>
  );
}

export function JobCard({ job, showStatus, actions, headingLevel }: JobCardProps) {
  const { t, locale } = useTranslation();
  const hourly = job.budgetType === "HOURLY";
  const suffix = hourly ? t("jobs.perHour") : undefined;
  const postedAgo = formatTimeAgo(job.dateTimeCreated, locale);

  return (
    <LedgerRow
      headingLevel={headingLevel}
      href={`/jobs/${job.canonicalPath ?? job.id}`}
      title={job.title}
      eyebrow={
        <>
          <span className="inline-flex h-6 items-center rounded-control bg-primary-soft px-2 text-caption font-bold text-primary">
            {getCategoryName(job.category, t)}
          </span>
          {showStatus && job.lifecycleStatus ? <StatusChip kind="job" value={job.lifecycleStatus} /> : null}
          {job.boosted ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-control bg-ember-soft px-2 text-caption font-bold text-ember-text">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              {t("jobs.boosted")}
            </span>
          ) : null}
          {postedAgo ? <span className="tabular">{t("jobs.postedAgo").replace("{time}", postedAgo)}</span> : null}
        </>
      }
      meta={
        <>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{job.remote ? t("jobDetail.remote") : job.location}</span>
            </span>
            {typeof job.applicants === "number" ? (
              <span className="inline-flex items-center gap-1.5 tabular">
                <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                {job.applicants} {t("jobs.applicantsCount")}
              </span>
            ) : (
              // Server-rendered cards do not know the count yet: reserve its space so the live data does not shift the list (CLS).
              <span aria-hidden="true" data-placeholder="applicants" className="invisible inline-flex items-center gap-1.5 tabular">
                <Users className="h-4 w-4 shrink-0" />
                0 {t("jobs.applicantsCount")}
              </span>
            )}
          </p>
          {job.createdBy ? (
            <p className="pt-1">
              <PosterMiniTrust name={job.createdBy.name} image={job.createdBy.image} rating={job.createdBy.rating} reviews={job.createdBy.reviews} />
            </p>
          ) : (
            // Same height as the poster-trust line (24px avatar row) it is replaced by, so nothing moves when it loads.
            <p data-placeholder="poster" className="min-h-6 pt-1 font-bold text-ink">{job.employerName ?? ""}</p>
          )}
        </>
      }
      aside={
        <>
          <MoneyPlate
            className="hidden md:inline-flex"
            amount={job.budget}
            currency={job.budgetCurrency}
            label={hourly ? t("jobs.hourlyRate") : t("jobs.fixedBudget")}
            suffix={suffix}
          />
          <span className="inline-flex flex-col rounded-control border border-money/25 bg-money-soft px-2 py-1 md:hidden">
            {hourly ? null : <span className="text-micro uppercase text-ink-muted">{t("jobs.fixedPrice")}</span>}
            <MoneyPlate size="inline" amount={job.budget} currency={job.budgetCurrency} suffix={suffix} />
          </span>
        </>
      }
      actions={actions}
    />
  );
}
