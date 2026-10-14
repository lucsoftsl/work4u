"use client";

import Image from "next/image";
import Link from "@/components/LocaleLink";
import { MapPin, Star } from "lucide-react";
import type { NearbyWorkerListing } from "@/api/types";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";

const AVAILABILITY_STYLES: Record<NearbyWorkerListing["availability"], { key: string; dot: string; badge: string }> = {
  AVAILABLE: { key: "workers.availableNow", dot: "bg-emerald-500", badge: "bg-emerald-50 text-success" },
  BUSY: { key: "workers.busy", dot: "bg-amber-500", badge: "bg-amber-50 text-warning" },
  PAUSED: { key: "workers.paused", dot: "bg-slate-400", badge: "bg-slate-100 text-ink-muted" },
};

function formatRate(amount: number, currency: string, pricingModel: "HOURLY" | "FIXED") {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

  return pricingModel === "HOURLY" ? `${formatted}/hr` : formatted;
}

interface NearbyWorkerCardProps {
  listing: NearbyWorkerListing;
  isActive?: boolean;
  onHoverChange?: (listingId: string | null) => void;
  onInvite: (listing: NearbyWorkerListing) => void;
}

export function NearbyWorkerCard({ listing, isActive, onHoverChange, onInvite }: NearbyWorkerCardProps) {
  const worker = listing.worker;
  const availability = AVAILABILITY_STYLES[listing.availability];
  const { t } = useTranslation();

  const distanceLabel =
    listing.distanceKm < 1
      ? `${Math.round(listing.distanceKm * 1000)}m ${t("workers.away")}`
      : `${listing.distanceKm.toFixed(1)}km ${t("workers.away")}`;

  return (
    <article
      className={`rounded-card border border-line bg-surface p-5 transition ${isActive ? "border-primary/50 shadow-stamp" : ""}`}
      onMouseEnter={() => onHoverChange?.(listing.id)}
      onMouseLeave={() => onHoverChange?.(null)}
    >
      <div className="flex items-start gap-4">
        {worker?.image ? (
          <Image src={worker.image} alt={worker.name} width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-black text-primary">
            {worker?.name?.charAt(0) ?? "?"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-ink">{worker?.name || t("common.worker")}</h3>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${availability.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${availability.dot}`} />
              {t(availability.key)}
            </span>
          </div>

          <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-muted">
            <Star className="h-3.5 w-3.5 fill-money text-money" />
            {(worker?.rating ?? 0).toFixed(1)} ({worker?.reviews ?? 0} {t("jobDetail.reviews")})
          </p>

          <p className="mt-2 truncate text-sm font-semibold text-ink">{listing.title}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
            <span className="inline-flex items-center rounded-control bg-primary-soft px-2.5 py-1 text-micro uppercase text-primary">{getCategoryName(listing.category, t)}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {distanceLabel}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg font-black text-primary">{formatRate(listing.rate, listing.rateCurrency, listing.pricingModel)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
        <Link href={`/workers/${listing.workerId}`} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control border border-ink/80 bg-surface px-5 py-2.5 text-label text-ink transition-colors duration-fast hover:bg-sunken active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 flex-1 py-2 text-sm">
          {t("common.viewProfile")}
        </Link>
        <button type="button" onClick={() => onInvite(listing)} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-primary px-5 py-2.5 text-label text-on-fill transition-colors duration-fast hover:bg-primary-strong active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 flex-1 py-2 text-sm">
          {t("workers.inviteAction")}
        </button>
      </div>
    </article>
  );
}
