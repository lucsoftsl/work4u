"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";
import type { ApplicationStatus, MyApplication } from "@/api/types";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  PENDING: "bg-muted text-ink-muted",
  VIEWED: "bg-blue-50 text-blue-700",
  SHORTLISTED: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  WITHDRAWN: "bg-muted text-ink-subtle",
};

export default function MyApplicationsPage() {
  const router = useRouter();
  const { user, firebaseToken, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id || !firebaseToken) {
      router.push("/signin");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getMyApplications(user.id, firebaseToken);
        setApplications(data);
      } catch (err) {
        console.error("Failed to load applications:", err);
        setError(t("myApplications.errorLoad"));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id, firebaseToken, authLoading, router, t]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
          <ArrowLeft className="h-4 w-4" />
          {t("nav.backToDashboard")}
        </Link>
        <h1 className="mt-4 section-heading">{t("myApplications.title")}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">{t("myApplications.subtitle")}</p>

        <div className="mt-8">
          {loading ? (
            <div className="surface-panel p-10 text-center text-ink-muted">{t("myApplications.loading")}</div>
          ) : error ? (
            <div className="surface-panel p-10 text-center text-sm font-semibold text-red-600">{error}</div>
          ) : applications.length === 0 ? (
            <div className="surface-panel p-10 text-center">
              <p className="text-base font-semibold text-ink">{t("myApplications.emptyTitle")}</p>
              <p className="mt-2 text-sm text-ink-muted">{t("myApplications.emptyDesc")}</p>
              <Link href="/jobs" className="primary-cta mt-5 inline-flex">
                {t("myApplications.browseJobs")}
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {applications.map((application) => (
                <Link
                  key={application.id}
                  href={`/jobs/${application.jobId}`}
                  className="surface-card block p-5 transition hover:shadow-lg"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-ink">{application.job.title}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {application.job.budgetCurrency} {application.job.budget.toLocaleString()}
                        {application.job.budgetType === "HOURLY" ? t("jobDetail.hourly") : ` ${t("jobDetail.fixed")}`} ·{" "}
                        {getCategoryName(application.job.category, t)}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[application.status]}`}>
                      {t(`jobDetail.applicationStatus.${application.status}`)}
                    </span>
                  </div>
                  {application.coverLetter && (
                    <p className="mt-3 text-sm text-ink-muted line-clamp-2">{application.coverLetter}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
