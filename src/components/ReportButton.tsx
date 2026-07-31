"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { reportsApi } from "@/lib/reports-api";
import { useTranslation } from "@/lib/i18n";
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
    return <p className={`text-sm text-muted-foreground ${className ?? ""}`}>{t('report.submitted')}</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:underline ${className ?? ""}`}
      >
        <Flag size={14} />
        {jobId ? t('report.disputeJob') : `${t('report.reportAction')} ${reportedUserName}`}
      </button>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await reportsApi.createReport(
        { reportedUserId, jobId, reason, description: description.trim() || undefined },
        firebaseToken
      );
      setSubmitted(true);
      setOpen(false);
      onSubmitted?.();
    } catch (err) {
      console.error("Failed to submit report:", err);
      setError(err instanceof Error ? err.message : t('report.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3 ${className ?? ""}`}>
      <p className="text-sm font-semibold text-red-800">
        {jobId ? `${t('report.disputeJobWith')} ${reportedUserName}` : `${t('report.reportAction')} ${reportedUserName}`}
      </p>

      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as ReportReason)}
        className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
      >
        {Object.entries(REASON_KEYS).map(([value, key]) => (
          <option key={value} value={value}>{t(key)}</option>
        ))}
      </select>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder={t('report.descPlaceholder')}
        className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
      />

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800"
        >
          {t('jobDetail.cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? t('report.submitting') : t('report.submit')}
        </button>
      </div>
    </div>
  );
}
