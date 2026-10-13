"use client";
import { currentPath, signInPath } from "@/lib/auth-redirect";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";
import { buttonClasses } from "@/components/ui/Button";
import { LedgerRow } from "@/components/ui/LedgerRow";
import { MoneyPlate } from "@/components/ui/MoneyPlate";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/QueryState";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { isApplicationActive } from "@/components/dashboard/application-state";
import type { MyApplication } from "@/api/types";

type Filter = "all" | "active" | "closed";

export default function MyApplicationsPage() {
  const router = useRouter();
  const { user, firebaseToken, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    if (!user?.id || !firebaseToken) return;
    try {
      setLoading(true);
      setError(null);
      setApplications(await api.getMyApplications(user.id, firebaseToken));
    } catch (err) {
      console.error("Failed to load applications:", err);
      setError(t("myApplications.errorLoad"));
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

  const activeCount = useMemo(() => applications.filter(isApplicationActive).length, [applications]);
  const visible = useMemo(
    () =>
      applications.filter((a) => {
        if (filter === "all") return true;
        return filter === "active" ? isApplicationActive(a) : !isApplicationActive(a);
      }),
    [applications, filter]
  );

  return (
    <div className="mx-auto w-full max-w-content px-[var(--gutter)] py-6 md:py-10">
      <Link href="/dashboard" className={buttonClasses("ghost", "sm", "-ml-3")}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("nav.backToDashboard")}
      </Link>
      <h1 className="mt-2 font-display text-h1 text-ink">{t("myApplications.title")}</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-muted">{t("myApplications.subtitle")}</p>

      {!loading && !error && applications.length > 0 ? (
        <div className="mt-6">
          <FilterTabs
            label={t("myApplications.filterLabel")}
            value={filter}
            onChange={setFilter}
            tabs={[
              { value: "all", label: t("myApplications.filterAll"), count: applications.length },
              { value: "active", label: t("myApplications.filterActive"), count: activeCount },
              { value: "closed", label: t("myApplications.filterClosed"), count: applications.length - activeCount },
            ]}
          />
        </div>
      ) : null}

      <div className="mt-6" aria-live="polite">
        {loading ? (
          <ListSkeleton rows={3} label={t("myApplications.loading")} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : applications.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t("myApplications.emptyTitle")}
            description={t("myApplications.emptyDesc")}
            action={
              <Link href="/jobs" className={buttonClasses("primary")}>
                {t("myApplications.browseJobs")}
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t("myApplications.filterEmpty")} />
        ) : (
          <ul className="space-y-3 md:space-y-4">
            {visible.map((application) => {
              const { job } = application;
              const hourly = job.budgetType === "HOURLY";
              const canContinue =
                application.status === "ACCEPTED" && (job.lifecycleStatus === "IN_PROGRESS" || job.lifecycleStatus === "OPEN");
              // Accepted, withdrawn or rejected applications also show a closed/finished job.
              const showJobChip = application.status === "ACCEPTED" || job.lifecycleStatus === "CANCELLED";
              return (
                <li key={application.id}>
                  <LedgerRow
                    headingLevel="h2"
                    href={`/jobs/${application.jobId}`}
                    title={job.title}
                    eyebrow={
                      <>
                        <span className="inline-flex h-6 items-center rounded-control bg-primary-soft px-2 text-caption font-bold text-primary">
                          {getCategoryName(job.category, t)}
                        </span>
                        <StatusChip kind="application" value={application.status} />
                        {showJobChip ? <StatusChip kind="job" value={job.lifecycleStatus} /> : null}
                      </>
                    }
                    meta={application.coverLetter ? <p className="line-clamp-2 break-words">{application.coverLetter}</p> : undefined}
                    aside={
                      <>
                        <MoneyPlate
                          className="hidden md:inline-flex"
                          amount={job.budget}
                          currency={job.budgetCurrency}
                          label={hourly ? t("jobs.hourlyRate") : t("jobs.fixedBudget")}
                          suffix={hourly ? t("jobs.perHour") : undefined}
                        />
                        <span className="inline-flex rounded-control border border-money/25 bg-money-soft px-2 py-1 md:hidden">
                          <MoneyPlate size="inline" amount={job.budget} currency={job.budgetCurrency} suffix={hourly ? t("jobs.perHour") : undefined} />
                        </span>
                      </>
                    }
                    actions={
                      canContinue ? (
                        <Link href={`/jobs/${application.jobId}`} className={buttonClasses("primary", "default", "w-full sm:w-auto")}>
                          {t("dashboard.continueJob")}
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
