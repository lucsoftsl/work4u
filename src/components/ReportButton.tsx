"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { reportsApi } from "@/lib/reports-api";
import { useTranslation } from "@/lib/i18n";
import { errorMessage } from "@/lib/http";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import type { ReportReason } from "@/api/types";

const REASON_KEYS: Record<ReportReason, string> = {
  NO_SHOW: "report.reason.NO_SHOW",
  INAPPROPRIATE_BEHAVIOR: "report.reason.INAPPROPRIATE_BEHAVIOR",
  SCAM_OR_FRAUD: "report.reason.SCAM_OR_FRAUD",
  POOR_QUALITY_WORK: "report.reason.POOR_QUALITY_WORK",
  PAYMENT_DISPUTE: "report.reason.PAYMENT_DISPUTE",
  FAKE_LISTING: "report.reason.FAKE_LISTING",
  OTHER: "report.reason.OTHER",
};

interface ReportButtonProps {
  reportedUserId: string;
  reportedUserName: string;
  jobId?: string;
  firebaseToken: string | null;
  className?: string;
  onSubmitted?: () => void;
}

export function ReportButton({ reportedUserId, reportedUserName, jobId, firebaseToken, className, onSubmitted }: ReportButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>(jobId ? "PAYMENT_DISPUTE" : "INAPPROPRIATE_BEHAVIOR");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!firebaseToken) return null;

  if (submitted) {
    return (
      <p role="status" className={cn("text-label font-normal text-ink-muted", className)}>
        {t("report.submitted")}
      </p>
    );
  }

  const title = jobId ? `${t("report.disputeJobWith")} ${reportedUserName}` : `${t("report.reportAction")} ${reportedUserName}`;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className={cn(
          "inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-control px-3 text-label text-danger hover:bg-danger-soft",
          className
        )}
      >
        <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{jobId ? t("report.disputeJob") : title}</span>
      </button>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await reportsApi.createReport({ reportedUserId, jobId, reason, description: description.trim() || undefined }, firebaseToken);
      setSubmitted(true);
      setOpen(false);
      onSubmitted?.();
    } catch (err) {
      console.error("Failed to submit report:", err);
      setError(errorMessage(err, t("report.submitError")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("space-y-3 rounded-card border border-danger/20 border-l-4 border-l-danger bg-danger-soft p-4", className)}>
      <p className="text-label text-ink">{title}</p>

      <Select label={t("report.reasonLabel")} value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
        {Object.entries(REASON_KEYS).map(([value, key]) => (
          <option key={value} value={value}>
            {t(key)}
          </option>
        ))}
      </Select>

      <Textarea
        label={t("report.descLabel")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder={t("report.descPlaceholder")}
      />

      {error ? (
        <p role="alert" className="text-label font-bold text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
          {t("jobDetail.cancel")}
        </Button>
        <Button variant="destructive" onClick={handleSubmit} loading={submitting}>
          {submitting ? t("report.submitting") : t("report.submit")}
        </Button>
      </div>
    </div>
  );
}
