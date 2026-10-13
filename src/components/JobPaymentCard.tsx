"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MoneyPlate } from "@/components/ui/MoneyPlate";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/http";
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

  const methodLabel = (method: JobPaymentMethod | null) =>
    method === "CASH" ? t("payment.methodCash") : method === "BANK_TRANSFER" ? t("payment.methodBankTransfer") : "—";

  const run = async (action: () => Promise<Job>, fallbackKey: string) => {
    setSubmitting(true);
    setError(null);
    try {
      onUpdated(await action());
    } catch (err) {
      console.error("Payment action failed:", err);
      setError(errorMessage(err, t(fallbackKey)));
    } finally {
      setSubmitting(false);
    }
  };

  const hourly = job.budgetType === "HOURLY";

  return (
    <section aria-labelledby="job-payment-title" className="rounded-card border border-line bg-surface p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 id="job-payment-title" className="font-display text-h3 text-ink">
          {t("payment.title")}
        </h2>
        <MoneyPlate
          amount={job.budget}
          currency={job.budgetCurrency}
          label={hourly ? t("jobs.hourlyRate") : t("jobs.fixedBudget")}
          suffix={hourly ? t("jobs.perHour") : undefined}
        />
      </div>

      {error ? (
        <p role="alert" className="mb-3 flex items-start gap-2 rounded-control bg-danger-soft p-3 text-label font-normal text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      {job.paymentConfirmedAt ? (
        <p className="flex items-center gap-2 text-body text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          {t("payment.confirmedVia")} {methodLabel(job.paymentMethod)}
        </p>
      ) : job.paymentMarkedPaidAt ? (
        isPoster ? (
          <p className="flex items-start gap-2 text-body text-ink-muted">
            <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              {t("payment.youMarkedPaidVia")} {methodLabel(job.paymentMethod)}. {t("payment.waitingWorkerConfirm")}
            </span>
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-body text-ink-muted">
              {t("payment.requesterMarkedPaidVia")} {methodLabel(job.paymentMethod)}.
            </p>
            <Button className="w-full" loading={submitting} onClick={() => run(() => api.confirmJobPayment(job.id, firebaseToken), "payment.confirmError")}>
              {submitting ? t("payment.confirming") : t("payment.confirmReceived")}
            </Button>
          </div>
        )
      ) : isPoster ? (
        <div className="space-y-3">
          <SegmentedControl<JobPaymentMethod>
            label={t("payment.methodLabel")}
            value={selectedMethod}
            onChange={setSelectedMethod}
            className="flex w-full"
            options={[
              { value: "CASH", label: t("payment.methodCash") },
              { value: "BANK_TRANSFER", label: t("payment.methodBankTransfer") },
            ]}
          />
          <Button
            className="w-full"
            loading={submitting}
            onClick={() => run(() => api.markJobPaid(job.id, selectedMethod, firebaseToken), "payment.markPaidError")}
          >
            {submitting ? t("payment.saving") : t("payment.markAsPaid")}
          </Button>
        </div>
      ) : (
        <p className="flex items-start gap-2 text-body text-ink-muted">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          {t("payment.waitingRequesterMark")}
        </p>
      )}
    </section>
  );
}
