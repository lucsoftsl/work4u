"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import type { Application, ApplicationStatus, Job } from "@/api/types";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  PENDING: "bg-muted text-ink-muted",
  VIEWED: "bg-blue-50 text-blue-700",
  SHORTLISTED: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  WITHDRAWN: "bg-muted text-ink-subtle",
};

export default function JobApplicantsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string | undefined;
  const { user, firebaseToken } = useAuth();
  const { t } = useTranslation();

  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !firebaseToken) {
      router.push("/signin");
      return;
    }
    if (!jobId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [jobData, applicantsData] = await Promise.all([
          api.getJob(jobId),
          api.getJobApplicants(jobId, firebaseToken),
        ]);
        setJob(jobData);
        setApplicants(applicantsData);
      } catch (err) {
        console.error("Failed to load applicants:", err);
        setError(err instanceof Error ? err.message : t('applicants.errorLoad'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [jobId, user?.id, firebaseToken, router, t]);

  async function handleStatusChange(applicationId: string, status: ApplicationStatus) {
    if (!firebaseToken) return;
    if (status === "ACCEPTED") {
      const confirmed = window.confirm(t('applicants.confirmAccept'));
      if (!confirmed) return;
    }

    setActingOnId(applicationId);
    try {
      const updated = await api.updateApplicationStatus(applicationId, status, firebaseToken);
      setApplicants((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (status === "ACCEPTED" && jobId) {
        const refreshedJob = await api.getJob(jobId);
        setJob(refreshedJob);
      }
    } catch (err) {
      console.error("Failed to update application:", err);
      alert(err instanceof Error ? err.message : t('applicants.errorUpdate'));
    } finally {
      setActingOnId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/my-jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
          <ArrowLeft className="h-4 w-4" />
          {t('workers.backToMyJobs')}
        </Link>

        <h1 className="mt-4 section-heading">{job ? `${t('applicants.headingFor')} "${job.title}"` : t('applicants.heading')}</h1>
        {job && (
          <p className="mt-2 text-sm text-ink-muted">
            {job.lifecycleStatus === "OPEN"
              ? t('applicants.statusOpen')
              : job.lifecycleStatus === "IN_PROGRESS"
              ? t('applicants.statusInProgress')
              : job.lifecycleStatus === "COMPLETED"
              ? t('applicants.statusCompleted')
              : t('applicants.statusCancelled')}
          </p>
        )}

        <div className="mt-8">
          {loading ? (
            <div className="surface-panel p-10 text-center text-ink-muted">{t('applicants.loading')}</div>
          ) : error ? (
            <div className="surface-panel p-10 text-center text-sm font-semibold text-red-600">{error}</div>
          ) : applicants.length === 0 ? (
            <div className="surface-panel p-10 text-center">
              <p className="text-base font-semibold text-ink">{t('applicants.emptyTitle')}</p>
              <p className="mt-2 text-sm text-ink-muted">{t('applicants.emptyDesc')}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {applicants.map((application) => {
                const isHired = job?.hiredWorkerId === application.applicantId;
                const acting = actingOnId === application.id;
                const canAct = job?.lifecycleStatus === "OPEN" && application.status !== "WITHDRAWN";

                return (
                  <div key={application.id} className="surface-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {application.applicant?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={application.applicant.image}
                            alt={application.applicant.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                            {application.applicant?.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        <div>
                          <p className="text-base font-semibold text-ink">
                            {application.applicant?.name || t('applicants.fallbackName')}
                            {isHired && <span className="ml-2 text-xs font-bold text-green-700">{t('applicants.hired')}</span>}
                          </p>
                          <div className="flex items-center gap-1 text-sm text-ink-muted">
                            <Star size={14} className="text-yellow-500 fill-yellow-500" />
                            {application.applicant?.rating ?? 0} ({application.applicant?.reviews ?? 0} {t('jobDetail.reviews')})
                          </div>
                        </div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[application.status]}`}>
                        {t(`jobDetail.applicationStatus.${application.status}`)}
                      </span>
                    </div>

                    {application.coverLetter && (
                      <p className="mt-4 text-sm leading-6 text-ink-muted">{application.coverLetter}</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-muted">
                      {application.proposedRate != null && (
                        <span>
                          {t('applicants.proposedRate')} <strong className="text-ink">{application.proposedRate}</strong>
                        </span>
                      )}
                      {application.proposedDuration && (
                        <span>
                          {t('applicants.duration')} <strong className="text-ink">{application.proposedDuration}</strong>
                        </span>
                      )}
                    </div>

                    {canAct && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {application.status === "PENDING" && (
                          <button
                            onClick={() => handleStatusChange(application.id, "VIEWED")}
                            disabled={acting}
                            className="secondary-cta px-4 py-2 text-xs"
                          >
                            {t('applicants.markViewed')}
                          </button>
                        )}
                        {application.status !== "SHORTLISTED" && (
                          <button
                            onClick={() => handleStatusChange(application.id, "SHORTLISTED")}
                            disabled={acting}
                            className="secondary-cta px-4 py-2 text-xs"
                          >
                            {t('applicants.shortlist')}
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange(application.id, "ACCEPTED")}
                          disabled={acting}
                          className="primary-cta px-4 py-2 text-xs"
                        >
                          {t('applicants.acceptHire')}
                        </button>
                        <button
                          onClick={() => handleStatusChange(application.id, "REJECTED")}
                          disabled={acting}
                          className="secondary-cta px-4 py-2 text-xs text-red-600"
                        >
                          {t('applicants.reject')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
