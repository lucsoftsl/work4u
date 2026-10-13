"use client";

import { useId, useState, type FormEvent } from "react";
import { AlertCircle, Star } from "lucide-react";
import { reviewsApi } from "@/lib/reviews-api";
import { errorMessage } from "@/lib/http";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import type { Review } from "@/api/types";

interface ReviewFormProps {
  jobId: string;
  targetUserId: string;
  targetName: string;
  firebaseToken: string;
  onSubmitted: (review: Review) => void;
}

const RATINGS = [1, 2, 3, 4, 5] as const;

export function ReviewForm({ jobId, targetUserId, targetName, firebaseToken, onSubmitted }: ReviewFormProps) {
  const { t } = useTranslation();
  const groupId = useId();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (rating === 0) {
      setError(t("review.selectRatingError"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const review = await reviewsApi.createReview(
        { userId: targetUserId, ratingCount: rating, review: text.trim() || undefined, jobId },
        firebaseToken
      );
      onSubmitted(review);
    } catch (err) {
      console.error("Failed to submit review:", err);
      setError(errorMessage(err, t("review.submitError")));
    } finally {
      setSubmitting(false);
    }
  };

  const shown = hoverRating || rating;

  return (
    <section aria-labelledby={`${groupId}-title`} className="rounded-card border border-line bg-surface p-4 md:p-6">
      <h2 id={`${groupId}-title`} className="font-display text-h3 text-ink">
        {t("review.rateAction")} {targetName}
      </h2>
      <p className="mt-1 text-body text-ink-muted">{t("review.jobCompletedHint")}</p>

      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        {/* A real radio group: each star is a labelled radio ("1 star"…"5 stars"), arrow keys move between them. */}
        <fieldset aria-describedby={error ? `${groupId}-error` : undefined}>
          <legend className="mb-1 text-label text-ink">{t("review.ratingLabel")}</legend>
          <div className="flex items-center" onMouseLeave={() => setHoverRating(0)}>
            {RATINGS.map((value) => (
              <label key={value} className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-control" onMouseEnter={() => setHoverRating(value)}>
                <input
                  type="radio"
                  name={`${groupId}-rating`}
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="peer sr-only"
                />
                <span className="sr-only">{value === 1 ? t("review.oneStar") : t("review.nStars").replace("{count}", String(value))}</span>
                <Star
                  aria-hidden="true"
                  className={cn(
                    "h-7 w-7 rounded-control transition-colors duration-fast peer-focus-visible:shadow-focus",
                    shown >= value ? "fill-money text-money" : "text-line-strong"
                  )}
                />
              </label>
            ))}
            {rating > 0 ? <span className="ml-2 text-label tabular text-ink-muted">{rating}/5</span> : null}
          </div>
        </fieldset>

        <Textarea label={t("review.commentLabel")} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("review.descPlaceholder")} />

        {error ? (
          <p id={`${groupId}-error`} role="alert" className="flex items-start gap-2 text-label font-normal text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" loading={submitting}>
          {submitting ? t("report.submitting") : t("review.submitReview")}
        </Button>
      </form>
    </section>
  );
}
