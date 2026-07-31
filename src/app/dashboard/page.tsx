'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, MapPin, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';

function humanizeStatus(status?: string | null): string {
  if (!status) return '—';
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const STATUS_LABEL_KEY: Record<string, string> = {
  ACTIVE: 'dashboard.statusActive',
  PENDING_VERIFICATION: 'dashboard.statusPendingVerification',
  PENDING_DELETION: 'dashboard.statusPendingDeletion',
  SUSPENDED: 'dashboard.statusSuspended',
};

const ACCOUNT_MODE_LABEL_KEY: Record<string, string> = {
  REQUESTOR: 'auth.signUp.requestorTitle',
  WORKER: 'auth.signUp.workerModeTitle',
  BOTH: 'auth.signUp.bothTitle',
};

const USER_TYPE_LABEL_KEY: Record<string, string> = {
  PERSONAL: 'auth.signUp.personal',
  ENTERPRISE: 'auth.signUp.enterprise',
  ADMIN: 'dashboard.userTypeAdmin',
};

export default function DashboardPage() {
  const { user, loading, isAuthenticated, signOut } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg font-medium">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/signin');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-7xl space-y-8">
        <section className="surface-card overflow-hidden">
          <div className="grid gap-8 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
            <div>
              <span className="eyebrow">{t('nav.dashboard')}</span>
              <h1 className="mt-5 font-display text-4xl font-black tracking-tight text-ink md:text-5xl">
                {t('dashboard.welcomeBack')}, {user.displayName?.split(' ')[0] || t('common.worker')}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
                {t('dashboard.subtitle')}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[24px] bg-[#eff7fa] p-5">
                  <p className="text-sm font-semibold text-ink-subtle">{t('dashboard.accountStatus')}</p>
                  <p className="mt-2 break-words text-xl font-black text-ink sm:text-2xl">
                    {STATUS_LABEL_KEY[user.status] ? t(STATUS_LABEL_KEY[user.status]) : humanizeStatus(user.status)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#eff7fa] p-5">
                  <p className="text-sm font-semibold text-ink-subtle">{t('dashboard.onboarding')}</p>
                  <p className="mt-2 text-2xl font-black text-ink">
                    {user.onboardingCompleted ? t('dashboard.complete') : `${t('dashboard.step')} ${user.onboardingStep ?? 1}/3`}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#eff7fa] p-5">
                  <p className="text-sm font-semibold text-ink-subtle">{t('dashboard.accountMode')}</p>
                  <p className="mt-2 text-2xl font-black text-ink">
                    {user.accountMode
                      ? (ACCOUNT_MODE_LABEL_KEY[user.accountMode] ? t(ACCOUNT_MODE_LABEL_KEY[user.accountMode]) : user.accountMode)
                      : t('dashboard.notSet')}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/post-job" className="primary-cta">{t('nav.postJob')}</Link>
                <Link href="/profile" className="secondary-cta">{t('dashboard.editProfile')}</Link>
                {user.userType === 'ADMIN' && (
                  <Link href="/admin" className="secondary-cta inline-flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {t('dashboard.adminDashboard')}
                  </Link>
                )}
              </div>
            </div>

            <aside className="rounded-[28px] bg-[#155e75] p-6 text-white">
              {user.photoUrl ? (
                <Image
                  src={user.photoUrl}
                  alt={user.displayName || t('common.worker')}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-full border-4 border-white/25 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15">
                  <span className="text-2xl font-black text-white">{user.displayName?.charAt(0).toUpperCase() || 'U'}</span>
                </div>
              )}

              <div className="mt-5">
                <h2 className="text-2xl font-black">{user.displayName}</h2>
                <p className="mt-1 text-sm text-white/78">{user.email}</p>
              </div>

              <div className="mt-6 space-y-3 text-sm text-white/82">
                <div className="flex items-center gap-3">
                  <UserRound className="h-4 w-4" />
                  <span>{USER_TYPE_LABEL_KEY[user.userType] ? t(USER_TYPE_LABEL_KEY[user.userType]) : user.userType}</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{user.emailVerified ? t('dashboard.emailVerified') : t('dashboard.emailPending')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4" />
                  <span>{user.city || user.country || t('dashboard.locationNotSet')}</span>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-bold text-[#155e75] transition hover:bg-white/90"
              >
                {t('nav.signOut')}
              </button>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="surface-card p-6 md:p-8">
            <h2 className="section-heading">{t('dashboard.profileSummary')}</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] bg-[#f7fbfc] p-5">
                <p className="text-sm font-semibold text-ink-subtle">{t('dashboard.roles')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.workerTypes.length > 0 ? user.workerTypes.map((type) => (
                    <span key={type} className="rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand">
                      {type === 'WORKER' ? t('dashboard.serviceProvider') : t('dashboard.jobPoster')}
                    </span>
                  )) : <span className="text-sm text-ink-muted">{t('dashboard.noRoles')}</span>}
                </div>
              </div>
              <div className="rounded-[24px] bg-[#f7fbfc] p-5">
                <p className="text-sm font-semibold text-ink-subtle">{t('dashboard.contact')}</p>
                <p className="mt-3 text-base font-semibold text-ink">{user.phoneNumber || t('dashboard.phoneNotAdded')}</p>
                <p className="mt-1 text-sm text-ink-muted">{user.email}</p>
              </div>
              <div className="rounded-[24px] bg-[#f7fbfc] p-5">
                <p className="text-sm font-semibold text-ink-subtle">{t('dashboard.verification')}</p>
                <div className="mt-3 space-y-2 text-sm text-ink">
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {user.emailVerified ? t('dashboard.emailVerified') : t('dashboard.emailNotVerified')}</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {user.phoneVerified ? t('dashboard.phoneVerified') : t('dashboard.phoneNotVerified')}</p>
                </div>
              </div>
              <div className="rounded-[24px] bg-[#f7fbfc] p-5">
                <p className="text-sm font-semibold text-ink-subtle">{t('dashboard.routing')}</p>
                <div className="mt-3 space-y-2">
                  <Link href="/my-jobs" className="flex items-center justify-between rounded-2xl border border-outline bg-white px-4 py-3 text-sm font-semibold text-ink">
                    {t('dashboard.jobsPosted')} <ArrowRight className="h-4 w-4 text-brand" />
                  </Link>
                  <Link href="/jobs" className="flex items-center justify-between rounded-2xl border border-outline bg-white px-4 py-3 text-sm font-semibold text-ink">
                    {t('dashboard.browseJobsToHire')} <ArrowRight className="h-4 w-4 text-brand" />
                  </Link>
                  <Link href="/my-applications" className="flex items-center justify-between rounded-2xl border border-outline bg-white px-4 py-3 text-sm font-semibold text-ink">
                    {t('dashboard.jobsApplied')} <ArrowRight className="h-4 w-4 text-brand" />
                  </Link>
                  <Link href="/my-listings" className="flex items-center justify-between rounded-2xl border border-outline bg-white px-4 py-3 text-sm font-semibold text-ink">
                    {t('dashboard.servicesOffered')} <ArrowRight className="h-4 w-4 text-brand" />
                  </Link>
                  <Link href="/workers" className="flex items-center justify-between rounded-2xl border border-outline bg-white px-4 py-3 text-sm font-semibold text-ink">
                    {t('dashboard.browseServices')} <ArrowRight className="h-4 w-4 text-brand" />
                  </Link>
                </div>
              </div>
            </div>
          </article>

          <article className="surface-card p-6 md:p-8">
            <h2 className="section-heading">{t('dashboard.nextActions')}</h2>
            <div className="mt-6 space-y-4">
              <Link href="/post-job" className="flex items-start gap-4 rounded-[24px] border border-outline bg-[#f7fbfc] p-5 transition hover:border-brand/35">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
                  <BriefcaseBusiness className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-base font-bold text-ink">{t('dashboard.createPostingTitle')}</span>
                  <span className="mt-1 block text-sm leading-6 text-ink-muted">
                    {t('dashboard.createPostingDesc')}
                  </span>
                </span>
              </Link>
              <Link href="/profile" className="flex items-start gap-4 rounded-[24px] border border-outline bg-[#f7fbfc] p-5 transition hover:border-brand/35">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4b548] text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-base font-bold text-ink">{t('dashboard.reviewOnboardingTitle')}</span>
                  <span className="mt-1 block text-sm leading-6 text-ink-muted">
                    {t('dashboard.reviewOnboardingDesc')}
                  </span>
                </span>
              </Link>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
