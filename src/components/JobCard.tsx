"use client";

import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, MapPin, Star, TrendingUp, Users } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    category: string;
    description: string;
    budget: number;
    budgetType: "FIXED" | "HOURLY";
    budgetCurrency: string;
    location: string;
    remote: boolean;
    applicants: number;
    boosted?: boolean;
    expiresAt?: string | null;
    createdBy: {
      userId: string;
      name: string;
      image?: string | null;
      rating: number;
      reviews: number;
    };
  };
}

function formatBudget(amount: number, currency: string, budgetType: "FIXED" | "HOURLY") {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

  return budgetType === "HOURLY" ? `${formatted}/hr` : formatted;
}

export function JobCard({ job }: JobCardProps) {
  const { t } = useTranslation();

  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <article className="surface-panel h-full p-6 transition hover:-translate-y-0.5 hover:border-brand/35">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand">
            {getCategoryName(job.category, t)}
          </span>
          <span className="rounded-full bg-[#fdf2d8] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#c98100]">
            {job.remote ? t("jobDetail.remote") : t("jobs.onSite")}
          </span>
          {job.boosted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
              <TrendingUp className="h-3 w-3" />
              {t("jobs.boosted")}
            </span>
          )}
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-black leading-tight text-ink">{job.title}</h3>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-muted">{job.description}</p>
          </div>
          <div className="shrink-0 rounded-[22px] bg-[#eff7fa] px-4 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-subtle">{t("jobDetail.budget")}</p>
            <p className="mt-1 text-lg font-black text-brand">{formatBudget(job.budget, job.budgetCurrency, job.budgetType)}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {job.remote ? t("jobs.flexibleLocation") : job.location}
          </span>
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4" />
            {job.applicants} {t("jobs.applicantsCount")}
          </span>
          <span className="inline-flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4" />
            {job.budgetType === "HOURLY" ? t("jobs.hourlyContract") : t("jobs.fixedScope")}
          </span>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-outline pt-5">
          <div className="flex items-center gap-3">
            {job.createdBy.image ? (
              <Image
                src={job.createdBy.image}
                alt={job.createdBy.name}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dce9ef] text-sm font-black text-brand">
                {job.createdBy.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-ink">{job.createdBy.name}</p>
              <p className="inline-flex items-center gap-1 text-xs text-ink-muted">
                <Star className="h-3.5 w-3.5 fill-[#f5b33f] text-[#f5b33f]" />
                {job.createdBy.rating.toFixed(1)} ({job.createdBy.reviews} {t("jobDetail.reviews")})
              </p>
            </div>
          </div>

          <span className="rounded-full border border-outline px-4 py-2 text-sm font-semibold text-ink">
            {t("common.viewDetails")}
          </span>
        </div>
      </article>
    </Link>
  );
}
