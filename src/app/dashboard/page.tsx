'use client';
import { currentPath, signInPath } from "@/lib/auth-redirect";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Briefcase, ClipboardList, Plus, Search, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { api } from '@/lib/api';
import { displayLocation } from '@/lib/user-location';
import { useAccountMode, type ViewMode } from '@/hooks/useAccountMode';
import { ViewModeSwitch } from '@/components/AppHeader';
import { buttonClasses } from '@/components/ui/Button';
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from '@/components/ui/QueryState';
import { LedgerRow } from '@/components/ui/LedgerRow';
import { StatusChip } from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';
import { AccountCard, AttentionBadge, AttentionCard, Checklist, DashboardCard, MoneyPill } from '@/components/dashboard/DashboardSections';
import {
  activeApplications,
  activeJobs,
  buildChecklist,
  hiringAttention,
  workingAttention,
} from '@/components/dashboard/dashboard-data';
import type { Job, MyApplication, WorkerListing } from '@/api/types';

const ACTIVE_PREVIEW_LIMIT = 4;

const PRIMARY_CTA: Record<ViewMode, { href: string; labelKey: string; icon: typeof Plus }> = {
  hiring: { href: '/post-job', labelKey: 'nav.postJob', icon: Plus },
  working: { href: '/jobs', labelKey: 'nav.findJobs', icon: Search },
};

const STATUS_LABEL_KEY: Record<string, string> = {
  PENDING_VERIFICATION: 'dashboard.statusPendingVerification',
  PENDING_DELETION: 'dashboard.statusPendingDeletion',
  SUSPENDED: 'dashboard.statusSuspended',
};

interface Activity {
  jobs?: Job[];
  applications?: MyApplication[];
  listings?: WorkerListing[];
}

export default function DashboardPage() {
  const { user, firebaseToken, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { view } = useAccountMode();

  const [activity, setActivity] = useState<Activity>({});
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(signInPath(currentPath()));
    }
  }, [loading, isAuthenticated, router]);

  const userId = user?.id;
  const loadActivity = useCallback(async () => {
    if (!userId || !firebaseToken) return;
    setActivityLoading(true);
    setActivityError(false);
    try {
      if (view === 'hiring') {
        setActivity({ jobs: await api.getMyJobs(userId, firebaseToken) });
      } else {
        const [applications, listings] = await Promise.all([
          api.getMyApplications(userId, firebaseToken),
          api.getMyListings(userId, firebaseToken),
        ]);
        setActivity({ applications, listings });
      }
    } catch (error) {
      console.error('Failed to load dashboard activity:', error);
      setActivity({});
      setActivityError(true);
    } finally {
      setActivityLoading(false);
    }
  }, [userId, firebaseToken, view]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-content space-y-6 px-[var(--gutter)] py-6 md:py-10" role="status" aria-busy="true">
        <span className="sr-only">{t('common.loading')}</span>
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const hiring = view === 'hiring';
  const cta = PRIMARY_CTA[view];
  const CtaIcon = cta.icon;
  const firstName = user.displayName?.split(' ')[0] || t('common.worker');

  const attention = hiring ? hiringAttention(activity.jobs ?? []) : workingAttention(activity.applications ?? []);
  const checklist = buildChecklist({
    view,
    emailVerified: !!user.emailVerified,
    phoneVerified: !!user.phoneVerified,
    onboardingCompleted: !!user.onboardingCompleted,
    jobs: activityError ? undefined : activity.jobs,
    listings: activityError ? undefined : activity.listings,
  });
  const showAttention = !activityLoading && !activityError && attention.length > 0;

  const jobsPreview = activeJobs(activity.jobs ?? []);
  const applicationsPreview = activeApplications(activity.applications ?? []);
  const activeTotal = hiring ? jobsPreview.length : applicationsPreview.length;

  const renderActive = () => {
    if (activityLoading) return <ListSkeleton rows={2} label={t('common.loading')} />;
    if (activeTotal === 0) {
      return hiring ? (
        <EmptyState
          icon={Briefcase}
          title={t('dashboard.noActiveJobs')}
          description={t('myJobs.noJobsSubtitle')}
          action={<Link href="/post-job" className={buttonClasses('primary')}>{t('myJobs.postFirst')}</Link>}
        />
      ) : (
        <EmptyState
          icon={ClipboardList}
          title={t('dashboard.noActiveApplications')}
          description={t('myApplications.emptyDesc')}
          action={<Link href="/jobs" className={buttonClasses('primary')}>{t('myApplications.browseJobs')}</Link>}
        />
      );
    }
    return (
      <ul className="space-y-3">
        {hiring
          ? jobsPreview.slice(0, ACTIVE_PREVIEW_LIMIT).map((job) => (
              <li key={job.id}>
                <LedgerRow
                  href={`/jobs/${job.id}`}
                  title={job.title}
                  eyebrow={
                    <>
                      <StatusChip kind="job" value={job.lifecycleStatus} />
                      {job.lifecycleStatus === 'IN_PROGRESS' && job.workStage ? <StatusChip kind="stage" value={job.workStage} /> : null}
                    </>
                  }
                  meta={
                    job.lifecycleStatus === 'OPEN' ? (
                      <p className="tabular">{job.applicants} {t('jobs.applicantsCount')}</p>
                    ) : undefined
                  }
                  aside={<MoneyPill amount={job.budget} currency={job.budgetCurrency} hourly={job.budgetType === 'HOURLY'} />}
                />
              </li>
            ))
          : applicationsPreview.slice(0, ACTIVE_PREVIEW_LIMIT).map((application) => (
              <li key={application.id}>
                <LedgerRow
                  href={`/jobs/${application.jobId}`}
                  title={application.job.title}
                  eyebrow={
                    <>
                      <StatusChip kind="application" value={application.status} />
                      {application.status === 'ACCEPTED' ? <StatusChip kind="job" value={application.job.lifecycleStatus} /> : null}
                    </>
                  }
                  aside={
                    <MoneyPill
                      amount={application.job.budget}
                      currency={application.job.budgetCurrency}
                      hourly={application.job.budgetType === 'HOURLY'}
                    />
                  }
                />
              </li>
            ))}
      </ul>
    );
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-[var(--gutter)] py-6 md:py-10">
      <div className="md:hidden">
        <ViewModeSwitch fullWidth />
      </div>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-4 md:p-6">
        <div className="min-w-0">
          <h1 className="break-words font-display text-h1 text-ink">
            {t('dashboard.welcomeBack')}, {firstName}.
          </h1>
          <p className="mt-2 text-body text-ink-muted">{hiring ? t('dashboard.heroSubHiring') : t('dashboard.heroSubWorking')}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link href={cta.href} className={buttonClasses('primary', 'lg', 'w-full sm:w-auto')}>
            <CtaIcon className="h-5 w-5" aria-hidden="true" />
            {t(cta.labelKey)}
          </Link>
          {user.userType === 'ADMIN' ? (
            <Link href="/admin" className={buttonClasses('secondary', 'lg', 'w-full sm:w-auto')}>
              <Settings className="h-5 w-5" aria-hidden="true" />
              {t('dashboard.adminDashboard')}
            </Link>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start">
        {activityError ? (
          <div className="xl:col-start-1 xl:row-start-1">
            <ErrorState message={t('dashboard.loadError')} onRetry={() => void loadActivity()} />
          </div>
        ) : null}

        {activityLoading || showAttention ? (
          <DashboardCard
            id="attention-heading"
            title={t('dashboard.attentionTitle')}
            aside={showAttention ? <AttentionBadge count={attention.length} /> : undefined}
            className="xl:col-start-1 xl:row-start-1"
          >
            {activityLoading ? (
              <ListSkeleton rows={1} label={t('common.loading')} />
            ) : (
              <div className="space-y-3">
                {attention.map((item) => (
                  <AttentionCard key={item.key} item={item} />
                ))}
              </div>
            )}
          </DashboardCard>
        ) : null}

        <div className="xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <Checklist items={checklist} />
        </div>

        {!activityError ? (
          <DashboardCard
            id="active-heading"
            title={hiring ? t('dashboard.activeJobs') : t('dashboard.activeApplications')}
            aside={
              activeTotal > 0 ? (
                <Link href={hiring ? '/my-jobs' : '/my-applications'} className={buttonClasses('ghost', 'sm', '-mr-3')}>
                  {t('dashboard.viewAll')}
                </Link>
              ) : undefined
            }
            className={cn('xl:col-start-1', activityLoading || showAttention ? 'xl:row-start-2' : 'xl:row-start-1')}
          >
            {renderActive()}
          </DashboardCard>
        ) : null}

        <div className="xl:col-start-2 xl:row-start-3">
          <AccountCard
            name={user.displayName || user.email || ''}
            email={user.email || ''}
            phone={user.phoneNumber}
            location={displayLocation(user) || t('dashboard.locationNotSet')}
            emailVerified={!!user.emailVerified}
            phoneVerified={!!user.phoneVerified}
            statusLabel={STATUS_LABEL_KEY[user.status] ? t(STATUS_LABEL_KEY[user.status]) : undefined}
          />
        </div>
      </div>
    </div>
  );
}
