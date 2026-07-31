"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { reviewsApi } from "@/lib/reviews-api";
import { useTranslation } from "@/lib/i18n";
import type { Review } from "@/api/types";

interface ReviewFormProps {
  jobId: string;
  targetUserId: string;
  targetName: string;
  firebaseToken: string;
  onSubmitted: (review: Review) => void;
}

export function ReviewForm({ jobId, targetUserId, targetName, firebaseToken, onSubmitted }: ReviewFormProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError(t('review.selectRatingError'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const review = await reviewsApi.createReview(
        {
          userId: targetUserId,
          ratingCount: rating,
          review: text.trim() || undefined,
          jobId,
        },
        firebaseToken
      );
      onSubmitted(review);
    } catch (err) {
      console.error("Failed to submit review:", err);
      setError(err instanceof Error ? err.message : t('review.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card shadow-sm rounded-2xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-foreground mb-1">{t('review.rateAction')} {targetName}</h3>
      <p className="text-sm text-muted-foreground mb-4">{t('review.jobCompletedHint')}</p>

      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHoverRating(value)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`${t('review.rateStarsAria')} ${value} ${t('review.stars')}`}
          >
            <Star
              size={28}
              className={(hoverRating || rating) >= value ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}
            />
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={t('review.descPlaceholder')}
        className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-4 w-full rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? t('report.submitting') : t('review.submitReview')}
      </button>
    </div>
  );
}
