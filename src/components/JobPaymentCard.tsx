"use client";

import { useState } from "react";
import { CheckCircle2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import type { Job, JobPaymentMethod } from "@/api/types";

interface JobPaymentCardProps {
  job: Job;
  firebaseToken: string;
  isPoster: boolean;
  onUpdated: (job: Job) => void;
}

export function JobPaymentCard({ job, firebaseToken, isPoster, onUpdated }: JobPaymentCardProps) {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<JobPaymentMethod>("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PAYMENT_METHOD_LABEL: Record<JobPaymentMethod, string> = {
    CASH: t('payment.methodCash'),
    BANK_TRANSFER: t('payment.methodBankTransfer'),
  };

  const handleMarkPaid = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.markJobPaid(job.id, selectedMethod, firebaseToken);
      onUpdated(updated);
    } catch (err) {
      console.error("Failed to mark job as paid:", err);
      setError(err instanceof Error ? err.message : t('payment.markPaidError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.confirmJobPayment(job.id, firebaseToken);
      onUpdated(updated);
    } catch (err) {
      console.error("Failed to confirm payment:", err);
      setError(err instanceof Error ? err.message : t('payment.confirmError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card shadow-sm rounded-2xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        <Wallet size={18} />
        {t('payment.title')}
      </h3>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {job.paymentConfirmedAt ? (
        <p className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 size={16} />
          {t('payment.confirmedVia')} {job.paymentMethod ? PAYMENT_METHOD_LABEL[job.paymentMethod] : "—"}
        </p>
      ) : job.paymentMarkedPaidAt ? (
        isPoster ? (
          <p className="text-sm text-muted-foreground">
            {t('payment.youMarkedPaidVia')} {job.paymentMethod ? PAYMENT_METHOD_LABEL[job.paymentMethod] : "—"}. {t('payment.waitingWorkerConfirm')}
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('payment.requesterMarkedPaidVia')} {job.paymentMethod ? PAYMENT_METHOD_LABEL[job.paymentMethod] : "—"}.
            </p>
            <Button className="w-full" onClick={handleConfirmPayment} disabled={submitting}>
              {submitting ? t('payment.confirming') : t('payment.confirmReceived')}
            </Button>
          </div>
        )
      ) : isPoster ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["CASH", "BANK_TRANSFER"] as JobPaymentMethod[]).map((method) => (
              <button
                key={method}
                onClick={() => setSelectedMethod(method)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  selectedMethod === method ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"
                }`}
              >
                {PAYMENT_METHOD_LABEL[method]}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={handleMarkPaid} disabled={submitting}>
            {submitting ? t('payment.saving') : t('payment.markAsPaid')}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('payment.waitingRequesterMark')}</p>
      )}
    </div>
  );
}
