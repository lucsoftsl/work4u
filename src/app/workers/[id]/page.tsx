"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, MessageSquare, Star } from "lucide-react";
import { ReviewsList } from "@/components/ReviewsList";
import { ReportButton } from "@/components/ReportButton";
import { buttonClasses } from "@/components/ui/Button";
import { MoneyPlate } from "@/components/ui/MoneyPlate";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/QueryState";
import { api } from "@/lib/api";
import { reviewsApi } from "@/lib/reviews-api";
import { chatHref } from "@/lib/chat-links";
import { signInPath } from "@/lib/auth-redirect";
import { errorMessage } from "@/lib/http";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";
import { cn } from "@/lib/utils";
import type { Review, WorkerListing } from "@/api/types";

type WorkerInfo = NonNullable<WorkerListing["worker"]>;

function Avatar({ worker, size }: { worker: WorkerInfo; size: number }) {
  if (worker.image) {
    return (
      <Image
        src={worker.image}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full border border-line object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-h2 text-primary"
    >
      {worker.name.charAt(0).toUpperCase()}
    </div>
  );
}

function TrustBlock({ worker, reviewCount }: { worker: WorkerInfo; reviewCount: number }) {
  const { t } = useTranslation();
  const hasRating = worker.rating > 0 && reviewCount > 0;
  return (
    <div className="flex items-center gap-4">
      <Avatar worker={worker} size={72} />
      <div className="min-w-0">
        <h1 className="break-words font-display text-h2 text-ink">{worker.name}</h1>
        {hasRating ? (
          <p className="mt-1 inline-flex flex-wrap items-center gap-1.5 text-label font-normal text-ink-muted">
            <Star className="h-4 w-4 fill-money text-money" aria-hidden="true" />
            <span className="font-bold tabular text-ink">{worker.rating.toFixed(1)}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular">
              {reviewCount} {t("jobDetail.reviews")}
            </span>
          </p>
        ) : (
          <span className="mt-2 inline-flex h-7 items-center rounded-control bg-info-soft px-2 text-caption font-bold text-info">
            {t("workers.newOnWork4u")}
          </span>
        )}
      </div>
    </div>
  );
}

function ServiceCard({ listing }: { listing: WorkerListing }) {
  const { t } = useTranslation();
  const hourly = listing.pricingModel === "HOURLY";
  return (
    <li className="rounded-card border border-line bg-surface p-4 md:p-6">
      <div className="flex items-start justify-between gap-3 md:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {listing.imageUrl ? (
            <Image
              src={listing.imageUrl}
              alt=""
              width={64}
              height={64}
              className="hidden h-16 w-16 shrink-0 rounded-card object-cover sm:block"
            />
          ) : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-control bg-primary-soft px-2 text-caption font-bold text-primary">
                {getCategoryName(listing.category, t)}
              </span>
              <StatusChip kind="availability" value={listing.availability} />
            </div>
            <h3 className="mt-2 break-words font-display text-h3 text-ink">{listing.title}</h3>
            <p className="mt-1.5 whitespace-pre-line break-words text-body text-ink-muted">{listing.description}</p>
            {listing.location || listing.serviceRadiusKm ? (
              <p className="mt-3 inline-flex items-start gap-2 text-label font-normal text-ink-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">
                  {listing.location || t("jobs.flexibleLocation")}
                  {listing.serviceRadiusKm ? ` · ${listing.serviceRadiusKm} km ${t("workers.radius")}` : ""}
                </span>
              </p>
            ) : null}
          </div>
        </div>
        <MoneyPlate
          className="shrink-0"
          amount={listing.rate}
          currency={listing.rateCurrency}
          label={t("common.rate")}
          suffix={hourly ? t("jobs.perHour") : undefined}
        />
      </div>
    </li>
  );
}

function ProfileSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-8" role="status" aria-busy="true">
      <span className="sr-only">{t("common.loading")}</span>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <Skeleton className="h-56" />
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}

export default function WorkerProfilePage() {
  const params = useParams();
  const { user, firebaseToken, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const workerId = params?.id as string | undefined;

  const [listings, setListings] = useState<WorkerListing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (!workerId) return;
    let isActive = true;

    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        setReviewsError(null);
        const [listingsData, reviewsData] = await Promise.all([
          api.listListings({ workerId }),
          reviewsApi.listReviews({ userId: workerId }).catch((error: unknown) => {
            console.error("Failed to load reviews:", error);
            if (isActive) setReviewsError(errorMessage(error, t("common.loadError")));
            return [] as Review[];
          }),
        ]);
        if (!isActive) return;
        setListings(listingsData);
        setReviews(reviewsData);
      } catch (error) {
        console.error("Failed to load worker profile:", error);
        if (isActive) setLoadError(errorMessage(error, t("common.loadError")));
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [workerId, reloadKey, t]);

  const worker = listings[0]?.worker;
  const reviewCount = worker?.reviews ?? reviews.length;
  const isOwnProfile = Boolean(worker && user?.id === worker.userId);

  if (loading) return <ProfileSkeleton />;

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 px-[var(--gutter)] py-12">
        <ErrorState message={loadError} onRetry={retry} />
        <Link href="/workers" className={buttonClasses("ghost")}>
          {t("workers.browseServices")}
        </Link>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="mx-auto w-full max-w-xl px-[var(--gutter)] py-12">
        <h1 className="sr-only">{t("workers.profileNotFound")}</h1>
        <EmptyState
          title={t("workers.profileNotFound")}
          description={t("workers.noServicesYet")}
          action={
            <Link href="/workers" className={buttonClasses("primary")}>
              {t("workers.browseServices")}
            </Link>
          }
        />
      </div>
    );
  }

  const messageHref = chatHref({ userId: worker.userId, userName: worker.name });
  const messageTarget = user || authLoading ? messageHref : signInPath(messageHref);
  const messageLabel = user || authLoading ? t("workers.message") : t("workers.signInToMessage");

  return (
    <div className={cn("mx-auto w-full max-w-content px-[var(--gutter)] py-6 md:py-10", !isOwnProfile && "pb-28 md:pb-10")}>
      <Link href="/workers" className="inline-flex min-h-[44px] items-center gap-2 rounded-control pr-3 text-label text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("workers.backToServices")}
      </Link>

      <div className="mt-2 grid items-start gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-8">
        <aside className="space-y-4 rounded-card border border-line bg-surface p-5 md:p-6 lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          <TrustBlock worker={worker} reviewCount={reviewCount} />

          {isOwnProfile ? (
            <Link href="/my-listings" className={buttonClasses("secondary", "default", "w-full")}>
              {t("workers.myServices")}
            </Link>
          ) : (
            <Link href={messageTarget} className={cn(buttonClasses("primary", "lg", "hidden w-full md:inline-flex"))}>
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              {messageLabel}
            </Link>
          )}

          {user?.id && !isOwnProfile ? (
            <div className="border-t border-line pt-3">
              <ReportButton reportedUserId={worker.userId} reportedUserName={worker.name} firebaseToken={firebaseToken} className="-ml-3" />
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 space-y-10">
          <section aria-labelledby="worker-services-heading">
            <h2 id="worker-services-heading" className="font-display text-h2 text-ink">
              {t("workers.servicesOffered")}
            </h2>
            <ul className="mt-4 space-y-3">
              {listings.map((listing) => (
                <ServiceCard key={listing.id} listing={listing} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="worker-reviews-heading">
            <h2 id="worker-reviews-heading" className="font-display text-h2 text-ink">
              {t("common.reviews")}
            </h2>
            <div className="mt-4">
              <ReviewsList reviews={reviews} error={reviewsError} onRetry={retry} />
            </div>
          </section>
        </div>
      </div>

      {!isOwnProfile ? (
        <div
          className={cn(
            "fixed inset-x-0 z-30 border-t border-line bg-surface px-4 py-3 shadow-raised md:hidden",
            user ? "bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))]" : "bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          )}
        >
          <Link href={messageTarget} className={buttonClasses("primary", "lg", "w-full")}>
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {messageLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
