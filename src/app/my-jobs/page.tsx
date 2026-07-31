"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Plus, TrendingUp, Zap } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { getSubscriptionStatus, type SubscriptionStatus } from "@/api/subscriptions";
import type { Job } from "@/api/types";

function daysUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function MyJobsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, firebaseToken, loading: authLoading } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [boostingJobId, setBoostingJobId] = useState<string | null>(null);

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";
  const activeCount = jobs.filter((j) => {
    if (!j.expiresAt) return true;
    return new Date(j.expiresAt) > new Date();
  }).length;

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
        const [myJobs, sub] = await Promise.all([
          api.getMyJobs(user.id, firebaseToken),
          getSubscriptionStatus(firebaseToken).catch(() => null),
        ]);
        setJobs(myJobs);
        setSubscription(sub);
      } catch (err) {
        console.error("Failed to load jobs:", err);
        setError(t("myJobs.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id, firebaseToken, authLoading, router, t]);

  async function handleBoost(jobId: string) {
    if (!firebaseToken) return;
    setBoostingJobId(jobId);
    try {
      const updated = await api.boostJob(jobId, firebaseToken);
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    } catch (err: any) {
      console.error("Boost failed:", err);
    } finally {
      setBoostingJobId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="surface-card overflow-hidden p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                <ArrowLeft className="h-4 w-4" />
                {t("nav.backToDashboard")}
              </Link>
              <h1 className="mt-4 section-heading">{t("myJobs.title")}</h1>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                {t("myJobs.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isPro ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-700">
                  <Zap className="h-3.5 w-3.5" />
                  {t("myJobs.proUnlimited")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-outline px-3 py-1.5 text-xs font-semibold text-ink-muted">
                  {activeCount}/3 {t("myJobs.freePostsUsed")}
                </span>
              )}
              <Link href="/post-job" className="primary-cta">
                <Plus className="mr-2 h-4 w-4" />
                {t("myJobs.postNew")}
              </Link>
            </div>
          </div>
        </section>

        {/* Free plan limit warning */}
        {!isPro && activeCount >= 3 && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-800">{t("myJobs.limitReachedTitle")}</p>
              <p className="text-sm text-amber-700 mt-0.5">{t("myJobs.limitReachedBody")}</p>
            </div>
            <Link href="/pricing" className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 transition-colors">
              {t("pricing.upgradeToPrefix")} {t("pricing.proTierName")}
            </Link>
          </div>
        )}

        <div className="mt-8">
          {loading ? (
            <div className="surface-panel p-10 text-center text-ink-muted">{t("myJobs.loading")}</div>
          ) : error ? (
            <div className="surface-panel p-10 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={() => window.location.reload()} className="primary-cta mt-4">
                {t("myJobs.tryAgain")}
              </button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="surface-panel p-10 text-center">
              <p className="text-base font-semibold text-ink">{t("myJobs.noJobs")}</p>
              <p className="mt-2 text-sm text-ink-muted">{t("myJobs.noJobsSubtitle")}</p>
              <Link href="/post-job" className="primary-cta mt-5 inline-flex">
                {t("myJobs.postFirst")}
              </Link>
            </div>
          ) : (
            <div>
              <p className="mb-5 text-sm text-ink-muted">
                {t("myJobs.activeJobs")} <span className="font-bold text-ink">{jobs.length}</span>{" "}
                {jobs.length === 1 ? t("myJobs.jobSingular") : t("myJobs.jobPlural")}
              </p>
              <div className="grid gap-5">
                {jobs.map((job) => {
                  const days = daysUntil(job.expiresAt);
                  const isExpired = days !== null && days === 0;

                  return (
                    <div key={job.id} className="space-y-2">
                      <div className={isExpired ? "opacity-60" : ""}>
                        <JobCard job={job} />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link href={`/jobs/${job.id}`} className="secondary-cta">
                            {t("myJobs.view")}
                          </Link>
                          <Link href={`/jobs/${job.id}/edit`} className="secondary-cta">
                            {t("myJobs.edit")}
                          </Link>
                          <Link href={`/my-jobs/${job.id}/applicants`} className="secondary-cta">
                            {t("myJobs.applicants")}{job.applicants > 0 ? ` (${job.applicants})` : ""}
                          </Link>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {/* Expiry indicator */}
                          {days !== null && (
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                              isExpired
                                ? "text-red-500"
                                : days <= 3
                                ? "text-amber-600"
                                : "text-ink-subtle"
                            }`}>
                              <Clock className="h-3.5 w-3.5" />
                              {isExpired ? t("myJobs.expired") : `${t("myJobs.expiresIn")} ${days}${t("myJobs.daysAbbrev")}`}
                            </span>
                          )}

                          {/* Boost button */}
                          {isPro ? (
                            job.boosted ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-700">
                                <TrendingUp className="h-3.5 w-3.5" />
                                {t("myJobs.boosted")}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleBoost(job.id)}
                                disabled={boostingJobId === job.id || isExpired}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/5 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand/10 transition-colors disabled:opacity-50"
                              >
                                <TrendingUp className="h-3.5 w-3.5" />
                                {boostingJobId === job.id ? t("myJobs.boosting") : t("myJobs.boostPost")}
                              </button>
                            )
                          ) : (
                            <Link
                              href="/pricing"
                              className="inline-flex items-center gap-1.5 rounded-xl border border-outline px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                              {t("myJobs.boostPro")}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
