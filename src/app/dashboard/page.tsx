'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, MapPin, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user, loading, isAuthenticated, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg font-medium">Loading...</div>
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
              <span className="eyebrow">Dashboard</span>
              <h1 className="mt-5 font-display text-4xl font-black tracking-tight text-ink md:text-5xl">
                Welcome back, {user.displayName?.split(' ')[0] || 'there'}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
                This view brings your account status, onboarding progress, and the most likely next actions into one place.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] bg-[#eff7fa] p-5">
                  <p className="text-sm font-semibold text-ink-subtle">Account status</p>
                  <p className="mt-2 text-2xl font-black text-ink">{user.status}</p>
                </div>
                <div className="rounded-[24px] bg-[#eff7fa] p-5">
                  <p className="text-sm font-semibold text-ink-subtle">Onboarding</p>
                  <p className="mt-2 text-2xl font-black text-ink">{user.onboardingCompleted ? 'Complete' : `Step ${user.onboardingStep ?? 1}/3`}</p>
                </div>
                <div className="rounded-[24px] bg-[#eff7fa] p-5">
                  <p className="text-sm font-semibold text-ink-subtle">Account mode</p>
                  <p className="mt-2 text-2xl font-black text-ink">{user.accountMode || 'Not set'}</p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/post-job" className="primary-cta">Post a job</Link>
                <Link href="/profile" className="secondary-cta">Edit profile</Link>
              </div>
            </div>

            <aside className="rounded-[28px] bg-[#155e75] p-6 text-white">
              {user.photoUrl ? (
                <Image
                  src={user.photoUrl}
                  alt={user.displayName || 'User'}
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
                  <span>{user.userType}</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{user.emailVerified ? 'Email verified' : 'Email verification pending'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4" />
                  <span>{user.city || user.country || 'Location not set yet'}</span>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-bold text-[#155e75] transition hover:bg-white/90"
              >
                Sign out
              </button>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="surface-card p-6 md:p-8">
            <h2 className="section-heading">Profile summary</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] bg-[#f7fbfc] p-5">
                <p className="text-sm font-semibold text-ink-subtle">Roles</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.workerTypes.length > 0 ? user.workerTypes.map((type) => (
                    <span key={type} className="rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand">
                      {type === 'WORKER' ? 'Service provider' : 'Job poster'}
                    </span>
                  )) : <span className="text-sm text-ink-muted">No roles selected</span>}
                </div>
              </div>
              <div className="rounded-[24px] bg-[#f7fbfc] p-5">
                <p className="text-sm font-semibold text-ink-subtle">Contact</p>
                <p className="mt-3 text-base font-semibold text-ink">{user.phoneNumber || 'Phone not added'}</p>
                <p className="mt-1 text-sm text-ink-muted">{user.email}</p>
              </div>
              <div className="rounded-[24px] bg-[#f7fbfc] p-5">
                <p className="text-sm font-semibold text-ink-subtle">Verification</p>
                <div className="mt-3 space-y-2 text-sm text-ink">
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {user.emailVerified ? 'Email verified' : 'Email not verified'}</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {user.phoneVerified ? 'Phone verified' : 'Phone not verified'}</p>
                </div>
              </div>
              <div className="rounded-[24px] bg-[#f7fbfc] p-5">
                <p className="text-sm font-semibold text-ink-subtle">Routing</p>
                <div className="mt-3 space-y-2">
                  <Link href="/my-jobs" className="flex items-center justify-between rounded-2xl border border-outline bg-white px-4 py-3 text-sm font-semibold text-ink">
                    My jobs <ArrowRight className="h-4 w-4 text-brand" />
                  </Link>
                  <Link href="/jobs" className="flex items-center justify-between rounded-2xl border border-outline bg-white px-4 py-3 text-sm font-semibold text-ink">
                    Browse jobs <ArrowRight className="h-4 w-4 text-brand" />
                  </Link>
                </div>
              </div>
            </div>
          </article>

          <article className="surface-card p-6 md:p-8">
            <h2 className="section-heading">Next actions</h2>
            <div className="mt-6 space-y-4">
              <Link href="/post-job" className="flex items-start gap-4 rounded-[24px] border border-outline bg-[#f7fbfc] p-5 transition hover:border-brand/35">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
                  <BriefcaseBusiness className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-base font-bold text-ink">Create a new posting</span>
                  <span className="mt-1 block text-sm leading-6 text-ink-muted">
                    Publish a new opportunity with the refined multi-step form.
                  </span>
                </span>
              </Link>
              <Link href="/signup" className="flex items-start gap-4 rounded-[24px] border border-outline bg-[#f7fbfc] p-5 transition hover:border-brand/35">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4b548] text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-base font-bold text-ink">Review onboarding details</span>
                  <span className="mt-1 block text-sm leading-6 text-ink-muted">
                    Revisit account mode and profile basics if you want to refine your setup.
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
