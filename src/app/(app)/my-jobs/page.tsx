"use client";
import { currentPath, signInPath } from "@/lib/auth-redirect";
import { planEntitlements } from "@/lib/plan-entitlements";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "@/components/LocaleLink";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Clock, Plus, TrendingUp, XCircle, Zap } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/QueryState";
import { CountBadge, StatusChip } from "@/components/ui/StatusChip";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { api } from "@/lib/api";
import { chatHref } from "@/lib/chat-links";
import { ApiError, errorMessage } from "@/lib/http";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getSubscriptionStatus, type SubscriptionStatus } from "@/api/subscriptions";
import type { Job, JobLifecycleStatus } from "@/api/types";

import { usePlans } from "@/hooks/usePlans";
import { isPlanAvailable } from "@/lib/billing-plans";

const EXPIRY_SOON_DAYS = 3;
const DAY_MS = 1000 * 60 * 60 * 24;

type Filter = "all" | JobLifecycleStatus;
const FILTER_ORDER: readonly JobLifecycleStatus[] = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

function daysUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / DAY_MS));
}

export default function MyJobsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, firebaseToken, loading: authLoading } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [boostingJobId, setBoostingJobId] = useState<string | null>(null);
  const [boostError, setBoostError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Job | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { plans } = usePlans();
  const proAvailable = isPlanAvailable(plans, "pro");
  const { postLimit, unlimitedPosts: isUnlimited, boost: canBoost } = planEntitlements(subscription);
  const activeCount = jobs.filter((j) => !j.expiresAt || new Date(j.expiresAt) > new Date()).length;

  const load = useCallback(async () => {
    if (!user?.id || !firebaseToken) return;
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
  }, [user?.id, firebaseToken, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id || !firebaseToken) {
      router.push(signInPath(currentPath()));
      return;
    }
    void load();
  }, [user?.id, firebaseToken, authLoading, router, load]);

  async function handleBoost(jobId: string) {
    if (!firebaseToken) return;
    setBoostingJobId(jobId);
    setBoostError(null);
    try {
      const updated = await api.boostJob(jobId, firebaseToken);
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    } catch (err: unknown) {
      console.error("Boost failed:", err);
      setBoostError(errorMessage(err, t("common.loadError")));
    } finally {
      setBoostingJobId(null);
    }
  }

  async function confirmCancel() {
    if (!firebaseToken || !cancelTarget) return;
    const target = cancelTarget;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await api.cancelJob(target.id, firebaseToken);
      setJobs((prev) =>
        prev.map((j) => (j.id === target.id ? { ...j, ...(updated?.id ? updated : {}), lifecycleStatus: "CANCELLED" } : j))
      );
      setCancelTarget(null);
    } catch (err) {
      console.error("Cancel failed:", err);
      setCancelTarget(null);
      setCancelError(
        err instanceof ApiError && err.status === 409 ? t("jobDetail.cancelConflict") : errorMessage(err, t("jobDetail.cancelError"))
      );
    } finally {
      setCancelling(false);
    }
  }

  const counts = useMemo(() => {
    const byStatus = new Map<JobLifecycleStatus, number>();
    jobs.forEach((j) => byStatus.set(j.lifecycleStatus, (byStatus.get(j.lifecycleStatus) ?? 0) + 1));
    return byStatus;
  }, [jobs]);

  const visibleJobs = filter === "all" ? jobs : jobs.filter((j) => j.lifecycleStatus === filter);
  const limitReached = postLimit !== null && activeCount >= postLimit;

  return (
    <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-6 md:py-10">
      <Link href="/dashboard" className={buttonClasses("ghost", "sm", "-ml-3")}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("nav.backToDashboard")}
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-h1 text-ink">{t("myJobs.title")}</h1>
          <p className="mt-2 max-w-2xl text-body text-ink-muted">{t("myJobs.subtitle")}</p>
        </div>
        {jobs.length > 0 ? (
          <Link href="/post-job" className={buttonClasses("primary")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("myJobs.postNew")}
          </Link>
        ) : null}
      </div>

      {/* Plan usage */}
      {!loading && !error ? (
        <div className="mt-6 rounded-card border border-line bg-surface p-4">
          {isUnlimited ? (
            <p className="inline-flex items-center gap-2 text-label font-bold text-warning">
              <Zap className="h-4 w-4" aria-hidden="true" />
              {t("myJobs.unlimitedPosts", "Unlimited active posts")}
            </p>
          ) : (
            <div>
              <p className="flex items-center justify-between gap-3 text-label font-bold text-ink">
                <span>{t("myJobs.planUsage")}</span>
                <span className="tabular text-ink-muted">
                  {activeCount}/{postLimit} {t("myJobs.activePostsUsed", "active posts used")}
                </span>
              </p>
              <div
                role="progressbar"
                aria-label={t("myJobs.planUsage")}
                aria-valuemin={0}
                aria-valuemax={postLimit ?? 0}
                aria-valuenow={Math.min(activeCount, postLimit ?? 0)}
                className="mt-2 h-2 overflow-hidden rounded-full bg-sunken"
              >
                <div
                  className={cn("h-full rounded-full", limitReached ? "bg-warning" : "bg-primary")}
                  style={{ width: `${postLimit ? Math.min(100, (activeCount / postLimit) * 100) : 100}%` }}
                />
              </div>
              {limitReached ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control bg-warning-soft p-3">
                  <div className="min-w-0">
                    <p className="text-label font-bold text-ink">
                      {t("myJobs.planLimitReachedTitle", "You've reached your plan's limit of {limit} active posts.").replace("{limit}", String(postLimit))}
                    </p>
                    <p className="text-caption text-ink-muted">
                      {t("myJobs.planLimitReachedBody", "Upgrade your plan for more active listings, longer visibility and post boosting.")}
                    </p>
                  </div>
                  {proAvailable ? (
                    <Link href="/pricing" className={buttonClasses("primary")}>
                      {t("pricing.upgradeToPrefix")} {t("pricing.proTierName")}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {!loading && !error && jobs.length > 0 ? (
        <div className="mt-6">
          <FilterTabs<Filter>
            label={t("myJobs.filterLabel")}
            value={filter}
            onChange={setFilter}
            tabs={[
              { value: "all", label: t("myJobs.tabAll"), count: jobs.length },
              ...FILTER_ORDER.map((status) => ({ value: status, label: t(`status.job.${status}`), count: counts.get(status) ?? 0 })),
            ]}
          />
        </div>
      ) : null}

      <div className="mt-6" aria-live="polite">
        {boostError ? (
          <p role="alert" className="mb-4 rounded-card border border-danger/20 border-l-4 border-l-danger bg-danger-soft p-3 text-label font-bold text-ink">
            {boostError}
          </p>
        ) : null}
        {cancelError ? (
          <p role="alert" className="mb-4 rounded-card border border-danger/20 border-l-4 border-l-danger bg-danger-soft p-3 text-label font-bold text-ink">
            {cancelError}
          </p>
        ) : null}

        {loading ? (
          <ListSkeleton rows={3} label={t("myJobs.loading")} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={t("myJobs.noJobs")}
            description={t("myJobs.noJobsSubtitle")}
            action={
              <Link href="/post-job" className={buttonClasses("primary")}>
                {t("myJobs.postFirst")}
              </Link>
            }
          />
        ) : visibleJobs.length === 0 ? (
          <EmptyState icon={Briefcase} title={t("myJobs.filterEmpty")} />
        ) : (
          <ul className="space-y-3 md:space-y-4">
            {visibleJobs.map((job) => {
              const days = daysUntil(job.expiresAt);
              const isOpen = job.lifecycleStatus === "OPEN";
              const isExpired = isOpen && days !== null && days === 0;
              const showApplicants = isOpen || job.applicants > 0;
              return (
                <li key={job.id} className={isExpired ? "opacity-70" : undefined}>
                  <JobCard
                    headingLevel="h2"
                    job={job}
                    showStatus
                    actions={
                      <>
                        {job.lifecycleStatus === "IN_PROGRESS" && job.workStage ? <StatusChip kind="stage" value={job.workStage} className="self-center" /> : null}
                        {showApplicants ? (
                          <Link
                            href={`/my-jobs/${job.id}/applicants`}
                            className={buttonClasses(isOpen && job.applicants > 0 ? "primary" : "secondary")}
                          >
                            {t("myJobs.viewApplicants")}
                            <CountBadge count={job.applicants} label={`${job.applicants} ${t("jobs.applicantsCount")}`} />
                          </Link>
                        ) : null}
                        {job.hiredWorkerId && (job.lifecycleStatus === "IN_PROGRESS" || job.lifecycleStatus === "COMPLETED") ? (
                          <Link
                            href={chatHref({ userId: job.hiredWorkerId, jobId: job.id, jobTitle: job.title })}
                            className={buttonClasses("secondary")}
                          >
                            {t("myJobs.messageHired")}
                          </Link>
                        ) : null}
                        {isOpen ? (
                          <Link href={`/jobs/${job.id}/edit`} className={buttonClasses("secondary")}>
                            {t("myJobs.edit")}
                          </Link>
                        ) : null}
                        {isOpen && !isExpired ? (
                          canBoost ? (
                            job.boosted ? null : (
                              <Button variant="ghost" onClick={() => void handleBoost(job.id)} loading={boostingJobId === job.id}>
                                {boostingJobId !== job.id ? <TrendingUp className="h-4 w-4" aria-hidden="true" /> : null}
                                {boostingJobId === job.id ? t("myJobs.boosting") : t("myJobs.boostPost")}
                              </Button>
                            )
                          ) : !proAvailable ? null : (
                            <Link href="/pricing" className={buttonClasses("ghost")}>
                              <TrendingUp className="h-4 w-4" aria-hidden="true" />
                              {t("myJobs.boostPro")}
                            </Link>
                          )
                        ) : null}
                        {isOpen ? (
                          <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setCancelTarget(job)}>
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                            {t("jobDetail.cancelJob")}
                          </Button>
                        ) : null}
                        {isOpen && days !== null ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 self-center text-caption font-bold tabular",
                              isExpired ? "text-danger" : days <= EXPIRY_SOON_DAYS ? "text-warning" : "text-ink-muted"
                            )}
                          >
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {isExpired ? t("myJobs.expired") : `${t("myJobs.expiresIn")} ${days}${t("myJobs.daysAbbrev")}`}
                          </span>
                        ) : null}
                      </>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={cancelTarget !== null}
        tone="destructive"
        title={t("jobDetail.confirmCancelTitle")}
        description={t("jobDetail.confirmCancelJob")}
        confirmLabel={t("jobDetail.cancelJob")}
        loading={cancelling}
        onConfirm={() => void confirmCancel()}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
