"use client";

import { Star } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { Review } from "@/api/types";

export function ReviewsList({ reviews }: { reviews: Review[] }) {
  const { t } = useTranslation();

  if (reviews.length === 0) {
    return <div className="surface-panel p-8 text-center text-sm text-ink-muted">{t('review.noReviewsYet')}</div>;
  }

  return (
    <div className="grid gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="surface-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-ink">{review.createdBy.name}</p>
            <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
              <Star className="h-3.5 w-3.5 fill-[#f5b33f] text-[#f5b33f]" />
              {review.ratingCount.toFixed(1)}
            </span>
          </div>
          {review.review && <p className="mt-2 text-sm leading-6 text-ink-muted">{review.review}</p>}
        </div>
      ))}
    </div>
  );
}
