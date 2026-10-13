"use client";

import { Star, MessageSquareText } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { EmptyState, ErrorState } from "@/components/ui/QueryState";
import type { Review } from "@/api/types";

interface ReviewsListProps {
  reviews: Review[];
  /** Load failure: shown instead of the empty state, with a retry action. */
  error?: string | null;
  onRetry?: () => void;
}

export function ReviewsList({ reviews, error, onRetry }: ReviewsListProps) {
  const { t, locale } = useTranslation();

  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  if (reviews.length === 0) {
    return <EmptyState icon={MessageSquareText} title={t("review.noReviewsYet")} description={t("review.noReviewsDesc")} />;
  }

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-card border border-line bg-surface p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-label text-ink">{review.createdBy.name}</p>
            <span className="inline-flex shrink-0 items-center gap-1 text-label tabular text-ink">
              <Star className="h-4 w-4 fill-money text-money" aria-hidden="true" />
              <span className="sr-only">{t("review.ratingLabel")}:</span>
              {review.ratingCount.toFixed(1)}
            </span>
          </div>
          {formatDate(review.dateTimeCreated) ? (
            <p className="mt-0.5 text-caption text-ink-subtle">{formatDate(review.dateTimeCreated)}</p>
          ) : null}
          {review.review ? <p className="mt-2 break-words text-body text-ink-muted">{review.review}</p> : null}
        </li>
      ))}
    </ul>
  );
}
