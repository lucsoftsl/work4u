"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { NearbyWorkerListing } from "@/api/types";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";

const AVAILABILITY_STYLES: Record<NearbyWorkerListing["availability"], { key: string; dot: string; badge: string }> = {
  AVAILABLE: { key: "workers.availableNow", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  BUSY: { key: "workers.busy", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700" },
  PAUSED: { key: "workers.paused", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600" },
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
      className={`surface-panel p-5 transition ${isActive ? "border-brand/50 shadow-soft" : ""}`}
      onMouseEnter={() => onHoverChange?.(listing.id)}
      onMouseLeave={() => onHoverChange?.(null)}
    >
      <div className="flex items-start gap-4">
        {worker?.image ? (
          <Image src={worker.image} alt={worker.name} width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#dce9ef] text-lg font-black text-brand">
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
            <Star className="h-3.5 w-3.5 fill-[#f5b33f] text-[#f5b33f]" />
            {(worker?.rating ?? 0).toFixed(1)} ({worker?.reviews ?? 0} {t("jobDetail.reviews")})
          </p>

          <p className="mt-2 truncate text-sm font-semibold text-ink">{listing.title}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
            <span className="eyebrow">{getCategoryName(listing.category, t)}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {distanceLabel}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg font-black text-brand">{formatRate(listing.rate, listing.rateCurrency, listing.pricingModel)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-outline pt-4">
        <Link href={`/workers/${listing.workerId}`} className="secondary-cta flex-1 py-2 text-sm">
          {t("common.viewProfile")}
        </Link>
        <button type="button" onClick={() => onInvite(listing)} className="primary-cta flex-1 py-2 text-sm">
          {t("workers.inviteAction")}
        </button>
      </div>
    </article>
  );
}
