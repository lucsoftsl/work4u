"use client";

import { useCallback, useEffect, useState } from "react";
import { ReviewsList } from "@/components/ReviewsList";
import { ListSkeleton } from "@/components/ui/QueryState";
import { reviewsApi } from "@/lib/reviews-api";
import { errorMessage } from "@/lib/http";
import { useTranslation } from "@/lib/i18n";
import type { Review } from "@/api/types";

export function ReviewsTab({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await reviewsApi.listReviews({ userId });
        if (isActive) setReviews(data);
      } catch (err) {
        console.error("Failed to load reviews:", err);
        if (isActive) setError(errorMessage(err, t("common.loadError")));
      } finally {
        if (isActive) setLoading(false);
      }
    };
    void load();
    return () => {
      isActive = false;
    };
  }, [userId, reloadKey, t]);

  if (loading) return <ListSkeleton rows={3} label={t("profile.loadingReviews")} />;
  return <ReviewsList reviews={reviews} error={error} onRetry={retry} />;
}
