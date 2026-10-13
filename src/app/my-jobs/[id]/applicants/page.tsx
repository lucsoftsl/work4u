"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Handshake, MessageSquare, Users } from "lucide-react";
import { currentPath, signInPath } from "@/lib/auth-redirect";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import type { Application, Job } from "@/api/types";
import { errorMessage } from "@/lib/http";
import { chatHref } from "@/lib/chat-links";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/QueryState";
import { MoneyPlate } from "@/components/ui/MoneyPlate";
import { StatusChip } from "@/components/ui/StatusChip";
import { ApplicantsBoard } from "@/components/ApplicantsBoard";

const STATUS_NOTE_KEY: Record<Job["lifecycleStatus"], string> = {
  OPEN: "applicants.statusOpen",
  IN_PROGRESS: "applicants.statusInProgress",
  COMPLETED: "applicants.statusCompleted",
  CANCELLED: "applicants.statusCancelled",
  DISPUTED: "applicants.statusDisputed",
};

export default function JobApplicantsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string | undefined;
  const { user, firebaseToken, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const signedIn = !!firebaseToken;

  useEffect(() => {
    // Wait for the session to be restored before deciding the user is signed out (reload-safe).
    if (authLoading) return;
    if (!user?.id || !signedIn) {
      router.push(signInPath(currentPath()));
      return;
    }
    if (!jobId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const jobData = await api.getJob(jobId);
        if (jobData.createdByUserId !== user.id) {
          setJob(jobData);
          setApplicants([]);
          setError(t("applicants.notOwner"));
          return;
        }
        const applicantsData = await api.getJobApplicants(jobId, firebaseToken ?? "");
        setJob(jobData);
        setApplicants(applicantsData);
      } catch (err) {
        console.error("Failed to load applicants:", err);
        setError(errorMessage(err, t("applicants.errorLoad")));
      } finally {
        setLoading(false);
      }
    };

    void load();
    // the token rotates hourly; only signed-in state matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, user?.id, signedIn, authLoading, router, t, reloadKey]);

  const hiredApplication = applicants.find((a) => job?.hiredWorkerId && a.applicantId === job.hiredWorkerId);
  const hiredName = hiredApplication?.applicant?.name || t("applicants.fallbackName");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-10">
      <Link href="/my-jobs" className={buttonClasses("ghost", "sm", "-ml-3")}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("workers.backToMyJobs")}
      </Link>

      <header className="mt-3 flex flex-col gap-4 rounded-card border border-line bg-surface p-4 md:flex-row md:items-start md:justify-between md:p-6">
        <div className="min-w-0 space-y-2">
          {job ? (
            <div className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
              <StatusChip kind="job" value={job.lifecycleStatus} />
              <span className="inline-flex items-center gap-1 tabular">
                <Users className="h-4 w-4" aria-hidden="true" />
                {applicants.length} {t("jobs.applicantsCount")}
              </span>
            </div>
          ) : null}
          <h1 className="break-words font-display text-h1 text-ink">
            {job ? `${t("applicants.headingFor")} “${job.title}”` : t("applicants.heading")}
          </h1>
          {job ? <p className="text-body text-ink-muted">{t(STATUS_NOTE_KEY[job.lifecycleStatus])}</p> : null}
        </div>
        {job && !error ? (
          <div className="flex shrink-0 flex-wrap items-start gap-3 md:flex-col md:items-end">
            <MoneyPlate
              amount={job.budget}
              currency={job.budgetCurrency}
              label={job.budgetType === "HOURLY" ? t("jobs.hourlyRate") : t("jobs.fixedBudget")}
              suffix={job.budgetType === "HOURLY" ? t("jobs.perHour") : undefined}
            />
            <Link href={`/jobs/${job.id}`} className={buttonClasses("secondary", "sm")}>
              {t("applicants.viewJob")}
            </Link>
          </div>
        ) : null}
      </header>

      {job && !error && hiredApplication ? (
        <section
          aria-label={t("applicants.hiredBannerAria")}
          className="mt-4 flex flex-col gap-3 rounded-card border border-success/30 border-l-4 border-l-success bg-success-soft p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2 text-body text-ink">
            <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <span>{t("applicants.hiredBanner").replace("{name}", hiredName)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={chatHref({ userId: hiredApplication.applicantId, userName: hiredApplication.applicant?.name, jobId: job.id, jobTitle: job.title })}
              className={buttonClasses("primary", "sm")}
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              {t("applicants.messageHired")}
            </Link>
            <Link href={`/jobs/${job.id}`} className={buttonClasses("secondary", "sm")}>
              {t("applicants.goToJob")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="applicants-list-heading" className="mt-6">
        <h2 id="applicants-list-heading" className="sr-only">
          {t("applicants.heading")}
        </h2>
        {loading ? (
          <ListSkeleton rows={3} label={t("applicants.loading")} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((n) => n + 1)} />
        ) : applicants.length === 0 || !job ? (
          <EmptyState
            icon={Users}
            title={t("applicants.emptyTitle")}
            description={t("applicants.emptyDesc")}
            action={
              job ? (
                <Link href={`/jobs/${job.id}`} className={buttonClasses("primary")}>
                  {t("applicants.viewJob")}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ApplicantsBoard
            job={job}
            applicants={applicants}
            firebaseToken={firebaseToken}
            variant="stack"
            showGoToJob
            onApplicationUpdated={(updated) => setApplicants((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))}
            onReload={() => setReloadKey((n) => n + 1)}
          />
        )}
      </section>
    </div>
  );
}
