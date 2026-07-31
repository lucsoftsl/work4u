"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { handleJobApplication } from "@/lib/gamification-utils";
import type { Application, Job } from "@/api/types";

const STATUS_LABEL_KEY: Record<Application["status"], string> = {
  PENDING: "jobDetail.applicationStatus.PENDING",
  VIEWED: "jobDetail.applicationStatus.VIEWED",
  SHORTLISTED: "jobDetail.applicationStatus.SHORTLISTED",
  ACCEPTED: "jobDetail.applicationStatus.ACCEPTED",
  REJECTED: "jobDetail.applicationStatus.REJECTED",
  WITHDRAWN: "jobDetail.applicationStatus.WITHDRAWN",
};

const WITHDRAWABLE_STATUSES: Application["status"][] = ["PENDING", "VIEWED", "SHORTLISTED"];

interface JobApplySidebarProps {
  job: Job;
  firebaseToken: string | null;
  userId: string | undefined;
}

export function JobApplySidebar({ job, firebaseToken, userId }: JobApplySidebarProps) {
  const { t } = useTranslation();

  const [myApplication, setMyApplication] = useState<Application | null | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [proposedDuration, setProposedDuration] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    if (!firebaseToken || !userId) {
      setMyApplication(null);
      return;
    }

    api
      .getMyApplications(userId, firebaseToken)
      .then((applications) => {
        if (!isActive) return;
        const existing = applications.find((application) => application.jobId === job.id);
        setMyApplication(existing ?? null);
      })
      .catch((err) => {
        console.error("Failed to check application status:", err);
        if (isActive) setMyApplication(null);
      });

    return () => {
      isActive = false;
    };
  }, [firebaseToken, userId, job.id]);

  const handleSubmit = async () => {
    if (!firebaseToken) return;

    setSubmitting(true);
    setError(null);
    try {
      const application = await api.applyToJob(
        job.id,
        {
          coverLetter: coverLetter.trim() || undefined,
          proposedRate: proposedRate ? Number(proposedRate) : undefined,
          proposedDuration: proposedDuration.trim() || undefined,
        },
        firebaseToken
      );
      setMyApplication(application);
      setShowForm(false);
      handleJobApplication();
    } catch (err) {
      console.error("Failed to apply to job:", err);
      setError(err instanceof Error ? err.message : t("jobDetail.applyError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!firebaseToken || !myApplication) return;

    setWithdrawing(true);
    setError(null);
    try {
      const updated = await api.updateApplicationStatus(myApplication.id, "WITHDRAWN", firebaseToken);
      setMyApplication(updated);
    } catch (err) {
      console.error("Failed to withdraw application:", err);
      setError(err instanceof Error ? err.message : t("jobDetail.applyError"));
    } finally {
      setWithdrawing(false);
    }
  };

  if (!firebaseToken) {
    return (
      <Button className="w-full" asChild>
        <Link href="/signin">{t("jobDetail.signInToApply")}</Link>
      </Button>
    );
  }

  if (myApplication === undefined) {
    return (
      <Button className="w-full" disabled>
        <Loader2 size={16} className="mr-2 animate-spin" />
        {t("jobDetail.applyToJob")}
      </Button>
    );
  }

  if (myApplication) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-100 bg-muted px-4 py-3">
          <p className="text-sm text-muted-foreground">{t("jobDetail.alreadyApplied")}</p>
          <p className="text-base font-semibold text-foreground">{t(STATUS_LABEL_KEY[myApplication.status])}</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {WITHDRAWABLE_STATUSES.includes(myApplication.status) && (
          <Button variant="outline" className="w-full" onClick={handleWithdraw} disabled={withdrawing}>
            {withdrawing ? t("jobDetail.withdrawing") : t("jobDetail.withdrawApplication")}
          </Button>
        )}
      </div>
    );
  }

  if (job.lifecycleStatus !== "OPEN") {
    return (
      <Button className="w-full" disabled title={t("jobDetail.notAcceptingApplications")}>
        {t("jobDetail.notAcceptingApplications")}
      </Button>
    );
  }

  if (!showForm) {
    return (
      <Button className="w-full" onClick={() => setShowForm(true)}>
        {t("jobDetail.applyToJob")}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={coverLetter}
        onChange={(e) => setCoverLetter(e.target.value)}
        placeholder={t("jobDetail.coverLetter")}
        rows={3}
        className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min="0"
          value={proposedRate}
          onChange={(e) => setProposedRate(e.target.value)}
          placeholder={t("jobDetail.proposedRate")}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          value={proposedDuration}
          onChange={(e) => setProposedDuration(e.target.value)}
          placeholder={t("jobDetail.proposedDuration")}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} disabled={submitting}>
          {t("jobDetail.cancel")}
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t("jobDetail.applying") : t("jobDetail.submitApplication")}
        </Button>
      </div>
    </div>
  );
}
