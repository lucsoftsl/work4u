"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, Trash2 } from "lucide-react";
import type { ListingAvailability, WorkerListing } from "@/api/types";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";
import { LedgerRow } from "@/components/ui/LedgerRow";
import { MoneyPlate } from "@/components/ui/MoneyPlate";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusChip } from "@/components/ui/StatusChip";
import { buttonClasses, Button } from "@/components/ui/Button";

const AVAILABILITY_OPTIONS: readonly ListingAvailability[] = ["AVAILABLE", "BUSY", "PAUSED"];

export interface WorkerListingOwnerControls {
  /** True while an availability change for this listing is in flight. */
  updating?: boolean;
  /** Inline error for this listing (availability change failed). */
  error?: string | null;
  onAvailabilityChange: (availability: ListingAvailability) => void;
  onRemove: () => void;
}

interface WorkerListingCardProps {
  headingLevel?: "h2" | "h3";
  listing: WorkerListing;
  /** Owner variant (My services): availability control, edit/public-profile links, remove. */
  owner?: WorkerListingOwnerControls;
}

export function WorkerListingCard({ listing, owner, headingLevel }: WorkerListingCardProps) {
  const worker = listing.worker;
  const { t } = useTranslation();
  const isHourly = listing.pricingModel === "HOURLY";
  const radius = listing.serviceRadiusKm ? `${listing.serviceRadiusKm}km ${t("workers.radius")}` : "";

  const actions = owner ? (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-label font-bold text-ink-muted">{t("myListings.availabilityLabel")}</span>
        <SegmentedControl
          label={t("myListings.availabilityLabel")}
          value={listing.availability}
          options={AVAILABILITY_OPTIONS.map((value) => ({ value, label: t(`status.availability.${value}`) }))}
          onChange={(next) => {
            if (!owner.updating && next !== listing.availability) owner.onAvailabilityChange(next);
          }}
          className={owner.updating ? "opacity-60" : undefined}
        />
      </div>
      {owner.error ? (
        <p role="alert" className="text-label font-bold text-danger">
          {owner.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Link href={`/workers/${listing.workerId}`} className={buttonClasses("secondary")}>
          {t("myListings.viewPublicProfile")}
        </Link>
        <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={owner.onRemove}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t("myListings.remove")}
        </Button>
      </div>
    </div>
  ) : undefined;

  return (
    <LedgerRow
      headingLevel={headingLevel}
      href={`/workers/${listing.workerId}`}
      title={listing.title}
      eyebrow={
        <>
          <span className="inline-flex h-6 items-center rounded-control bg-primary-soft px-2 text-caption font-bold text-primary">
            {getCategoryName(listing.category, t)}
          </span>
          <StatusChip kind="availability" value={listing.availability} />
        </>
      }
      meta={
        <>
          {listing.description ? <p className="line-clamp-2 break-words">{listing.description}</p> : null}
          {listing.location || radius ? (
            <p className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{[listing.location || t("jobs.flexibleLocation"), radius].filter(Boolean).join(" · ")}</span>
            </p>
          ) : null}
          {!owner && worker ? (
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-1">
              {worker.image ? (
                <Image src={worker.image} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-full object-cover" />
              ) : (
                <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-micro text-primary">
                  {worker.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 truncate font-bold text-ink">{worker.name}</span>
              {worker.reviews > 0 ? (
                <span className="inline-flex items-center gap-1 tabular text-money">
                  <Star className="h-3.5 w-3.5 fill-money" aria-hidden="true" />
                  <span className="font-bold">{worker.rating.toFixed(1)}</span>
                  <span aria-hidden="true">({worker.reviews})</span>
                  <span className="sr-only">{t("jobs.reviewsCountSr").replace("{count}", String(worker.reviews))}</span>
                </span>
              ) : (
                <span className="rounded-control bg-info-soft px-1.5 text-micro text-info">{t("jobs.newOnWork4u")}</span>
              )}
            </p>
          ) : null}
        </>
      }
      aside={
        <>
          <MoneyPlate
            className="hidden md:inline-flex"
            amount={listing.rate}
            currency={listing.rateCurrency}
            label={t("common.rate")}
            suffix={isHourly ? t("jobs.perHour") : undefined}
          />
          <span className="inline-flex rounded-control border border-money/25 bg-money-soft px-2 py-1 md:hidden">
            <MoneyPlate size="inline" amount={listing.rate} currency={listing.rateCurrency} suffix={isHourly ? t("jobs.perHour") : undefined} />
          </span>
        </>
      }
      actions={actions}
    />
  );
}
