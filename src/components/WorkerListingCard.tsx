"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { WorkerListing } from "@/api/types";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";

function formatRate(amount: number, currency: string, pricingModel: "HOURLY" | "FIXED") {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

  return pricingModel === "HOURLY" ? `${formatted}/hr` : formatted;
}

const AVAILABILITY_KEYS: Record<WorkerListing["availability"], string> = {
  AVAILABLE: "workers.availableNow",
  BUSY: "workers.busy",
  PAUSED: "workers.paused",
};

export function WorkerListingCard({ listing }: { listing: WorkerListing }) {
  const worker = listing.worker;
  const { t } = useTranslation();

  return (
    <Link href={`/workers/${listing.workerId}`} className="block">
      <article className="surface-panel h-full p-6 transition hover:-translate-y-0.5 hover:border-brand/35">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand">
            {getCategoryName(listing.category, t)}
          </span>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-green-700">
            {t(AVAILABILITY_KEYS[listing.availability])}
          </span>
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {listing.imageUrl && (
              <Image
                src={listing.imageUrl}
                alt={listing.title}
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              />
            )}
            <div className="min-w-0">
              <h3 className="text-xl font-black leading-tight text-ink">{listing.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-muted">{listing.description}</p>
            </div>
          </div>
          <div className="shrink-0 rounded-[22px] bg-[#eff7fa] px-4 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-subtle">{t("common.rate")}</p>
            <p className="mt-1 text-lg font-black text-brand">{formatRate(listing.rate, listing.rateCurrency, listing.pricingModel)}</p>
          </div>
        </div>

        {(listing.location || listing.serviceRadiusKm) && (
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {listing.location || t("jobs.flexibleLocation")}
              {listing.serviceRadiusKm ? ` · ${listing.serviceRadiusKm}km ${t("workers.radius")}` : ""}
            </span>
          </div>
        )}

        {worker && (
          <div className="mt-6 flex items-center justify-between border-t border-outline pt-5">
            <div className="flex items-center gap-3">
              {worker.image ? (
                <Image src={worker.image} alt={worker.name} width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dce9ef] text-sm font-black text-brand">
                  {worker.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-ink">{worker.name}</p>
                <p className="inline-flex items-center gap-1 text-xs text-ink-muted">
                  <Star className="h-3.5 w-3.5 fill-[#f5b33f] text-[#f5b33f]" />
                  {worker.rating.toFixed(1)} ({worker.reviews} {t("jobDetail.reviews")})
                </p>
              </div>
            </div>

            <span className="rounded-full border border-outline px-4 py-2 text-sm font-semibold text-ink">
              {t("common.viewProfile")}
            </span>
          </div>
        )}
      </article>
    </Link>
  );
}
