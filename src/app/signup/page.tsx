'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Mail,
  Phone,
  Shield,
  User,
  Wrench,
  Eye,
  EyeOff,
  Building2,
} from 'lucide-react';
import { completeSignupStep2, completeSignupStep3, signUp, signUpWithGoogle, updateUserProfile } from '@/lib/auth-service';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser } from '@/types/auth';
import { BrandMark } from '@/components/BrandMark';
import { CurrencySelector } from '@/components/CurrencySelector';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { useTranslation } from '@/lib/i18n';

type AccountMode = 'REQUESTOR' | 'WORKER' | 'BOTH';

function deriveProfileShape(mode: AccountMode): { workerTypes: Array<'WORKER' | 'REQUESTOR'>; profileTier: 'BASIC' | 'EXTENDED' } {
  if (mode === 'REQUESTOR') {
    return { workerTypes: ['REQUESTOR'], profileTier: 'BASIC' };
  }
  if (mode === 'WORKER') {
    return { workerTypes: ['WORKER'], profileTier: 'EXTENDED' };
  }
  return { workerTypes: ['WORKER', 'REQUESTOR'], profileTier: 'EXTENDED' };
}

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [accountUser, setAccountUser] = useState<AuthUser | null>(null);
  const [userType, setUserType] = useState<'PERSONAL' | 'ENTERPRISE'>('PERSONAL');
  const [accountMode, setAccountMode] = useState<AccountMode | null>(null);

  const [accountForm, setAccountForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    acceptedTerms: false,
  });

  const [profileForm, setProfileForm] = useState({
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
    bio: '',
    primarySkill: '',
    hourlyRate: '',
    hourlyRateCurrency: 'USD',
    serviceRadiusKm: '',
  });

  const selectedShape = useMemo(() => (accountMode ? deriveProfileShape(accountMode) : null), [accountMode]);
  const getErrorMessage = (value: unknown): string => (value instanceof Error ? value.message : t('auth.signUp.error.unknown'));
  const getFieldError = (
    field:
      | 'fullName'
      | 'email'
      | 'phoneNumber'
      | 'password'
      | 'acceptedTerms'
      | 'accountMode'
      | 'location'
  ) => {
    if (!error) return null;

    const normalized = error.toLowerCase();
    const lookup: Record<typeof field, string[]> = {
      fullName: ['full name'],
      email: ['email'],
      phoneNumber: ['phone number'],
      password: ['password'],
      acceptedTerms: ['terms', 'privacy policy'],
      accountMode: ['select one account mode'],
      location: ['location'],
    };

    return lookup[field].some((token) => normalized.includes(token)) ? error : null;
  };
  const isFirebaseEmailExistsError = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    const maybeCode = (value as { code?: unknown }).code;
    return typeof maybeCode === 'string' && maybeCode.includes('email-already-in-use');
  };

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      setAccountUser(user);

      if (user.onboardingCompleted) {
        router.replace('/');
        return;
      }

      if (user.onboardingStep && user.onboardingStep >= 3) {
        setStep(3);
      } else if (user.onboardingStep && user.onboardingStep >= 2) {
        setStep(2);
      } else {
        setStep(1);
      }

      if (user.userType === 'ENTERPRISE') {
        setUserType('ENTERPRISE');
      }

      if (user.accountMode) {
        setAccountMode(user.accountMode);
      }
    }
  }, [user, authLoading, router]);

  const handleAccountCreation = async (useGoogle: boolean) => {
    setError(null);

    if (!useGoogle) {
      if (!accountForm.fullName.trim()) return setError(t('auth.signUp.error.fullNameRequired'));
      if (!accountForm.email.trim()) return setError(t('auth.signUp.error.emailRequiredField'));
      if (!accountForm.phoneNumber.trim()) return setError(t('auth.signUp.error.phoneRequired'));
      if (!accountForm.password.trim()) return setError(t('auth.signUp.error.passwordRequiredField'));
      if (accountForm.password.length < 8) return setError(t('auth.signUp.error.passwordMinLength'));
      if (!accountForm.acceptedTerms) return setError(t('auth.signUp.error.acceptTerms'));
    }

    const cameBackFromLaterStep = step === 1 && ((user?.onboardingStep ?? accountUser?.onboardingStep ?? 1) >= 2);
    if (!useGoogle && accountUser && cameBackFromLaterStep) {
      setLoading(true);
      try {
        await updateUserProfile(accountUser.id, {
          displayName: accountForm.fullName.trim(),
          phoneNumber: accountForm.phoneNumber.trim(),
          userType,
          onboardingStep: 1,
          onboardingCompleted: false,
        });
        setStep(2);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || t('auth.signUp.error.continueFailed'));
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const created = useGoogle
        ? await signUpWithGoogle(userType, [])
        : await signUp({
            email: accountForm.email.trim(),
            password: accountForm.password,
            displayName: accountForm.fullName.trim(),
            phoneNumber: accountForm.phoneNumber.trim(),
            userType,
            workerTypes: [],
          });

      if (accountForm.phoneNumber.trim()) {
        await updateUserProfile(created.id, {
          phoneNumber: accountForm.phoneNumber.trim(),
          onboardingStep: 1,
          onboardingCompleted: false,
        });
      }

      setAccountUser({ ...created, onboardingStep: 1, onboardingCompleted: false });
      setStep(2);
    } catch (err: unknown) {
      if (!useGoogle && isFirebaseEmailExistsError(err) && (accountUser || user)) {
        try {
          if (accountUser) {
            await updateUserProfile(accountUser.id, {
              displayName: accountForm.fullName.trim() || accountUser.displayName || undefined,
              phoneNumber: accountForm.phoneNumber.trim() || accountUser.phoneNumber || undefined,
              userType,
              onboardingStep: 1,
              onboardingCompleted: false,
            });
          }
          setError(null);
          setStep(2);
          return;
        } catch (resumeErr: unknown) {
          setError(getErrorMessage(resumeErr) || t('auth.signUp.error.continueFailed'));
          return;
        }
      }
      setError(getErrorMessage(err) || t('auth.signUp.error.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccountModeContinue = async () => {
    if (!accountUser || !accountMode || !selectedShape) {
      setError(t('auth.signUp.error.selectMode'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await completeSignupStep2(accountMode);
      setStep(3);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('auth.signUp.error.saveModeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = async () => {
    if (!accountUser || !accountMode || !selectedShape) return;

    if (!accountForm.fullName.trim()) return setError(t('auth.signUp.error.fullNameRequired'));
    if (!profileForm.location.trim()) return setError(t('auth.signUp.error.locationRequired'));

    setLoading(true);
    setError(null);

    try {
      await completeSignupStep3({
        displayName: accountForm.fullName.trim(),
        phoneNumber: accountForm.phoneNumber.trim(),
        location: profileForm.location.trim(),
        latitude: profileForm.latitude ?? undefined,
        longitude: profileForm.longitude ?? undefined,
        bio: profileForm.bio.trim() || undefined,
        primarySkill: profileForm.primarySkill.trim() || undefined,
        hourlyRate: profileForm.hourlyRate.trim() || undefined,
        hourlyRateCurrency: profileForm.hourlyRate.trim() ? profileForm.hourlyRateCurrency : undefined,
        serviceRadiusKm: profileForm.serviceRadiusKm.trim() || undefined,
      });

      router.push(userType === 'ENTERPRISE' ? '/pricing?intent=business' : '/jobs');
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('auth.signUp.error.completeProfileFailed'));
    } finally {
      setLoading(false);
    }
  };
  const goToPreviousStep = () => {
    setError(null);
    setStep((prev) => {
      if (prev === 1) return 1;
      return (prev - 1) as 1 | 2 | 3;
    });
  };

  const profileProgressByStep: Record<1 | 2 | 3, number> = {
    1: 33,
    2: 25,
    3: 75,
  };
  const profileProgress = profileProgressByStep[step];
  const progressWidth = `${profileProgress}%`;
  const step2Options = [
    {
      mode: 'REQUESTOR' as const,
      title: t('auth.signUp.requestorTitle'),
      badge: t('auth.signUp.requestorBadge'),
      badgeClass: 'border-amber-300 bg-amber-100 text-amber-700',
      subtitle: t('auth.signUp.requestorSubtitle'),
      icon: BriefcaseBusiness,
      points: [t('auth.signUp.requestorPoint1'), t('auth.signUp.requestorPoint2')],
    },
    {
      mode: 'WORKER' as const,
      title: t('auth.signUp.workerModeTitle'),
      badge: t('auth.signUp.workerModeBadge'),
      badgeClass: 'border-blue-300 bg-blue-100 text-blue-700',
      subtitle: t('auth.signUp.workerModeSubtitle'),
      icon: Wrench,
      points: [t('auth.signUp.workerPoint1'), t('auth.signUp.workerPoint2')],
    },
    {
      mode: 'BOTH' as const,
      title: t('auth.signUp.bothTitle'),
      badge: t('auth.signUp.bothBadge'),
      badgeClass: 'border-purple-300 bg-purple-100 text-purple-700',
      subtitle: t('auth.signUp.bothSubtitle'),
      icon: Building2,
      points: [t('auth.signUp.bothPoint1'), t('auth.signUp.bothPoint2')],
    },
  ];

  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#eef1f4] px-4 py-8 md:px-8 md:py-12">
        <main className="mx-auto max-w-6xl">
          <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between">
            <button
              type="button"
              onClick={goToPreviousStep}
              className="inline-flex items-center gap-2 rounded-full border border-outline bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> {t('post.actions.back')}
            </button>
            <span className="text-sm font-bold text-ink-muted">{t('auth.signUp.roleSelectionBadge')}</span>
          </div>

          <div className="mx-auto mb-12 max-w-5xl">
            <div className="mb-3 flex items-center justify-between text-sm font-bold">
              <span className="uppercase tracking-[0.15em] text-brand">
                {t('dashboard.step')} 2 {t('common.of')} 3
              </span>
              <span className="text-ink-muted">
                {profileProgress}% {t('auth.signUp.profileCompleted')}
              </span>
            </div>
            <div className="h-3 rounded-full bg-[#dce3e8]">
              <div className="h-3 rounded-full bg-brand transition-all" style={{ width: progressWidth }} />
            </div>
          </div>

          <div className="mx-auto mb-10 max-w-4xl text-center">
            <h1 className="text-3xl font-black leading-tight text-ink md:text-4xl">{t('auth.signUp.choosePathTitle')}</h1>
            <p className="mx-auto mt-4 max-w-3xl text-sm text-ink-muted md:text-base">
              {t('auth.signUp.choosePathSubtitle')}
            </p>
          </div>

          {error && !getFieldError('accountMode') ? (
            <p className="mx-auto mb-5 max-w-5xl rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
          ) : null}

          <div className="mx-auto max-w-5xl space-y-5">
            {getFieldError('accountMode') ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{getFieldError('accountMode')}</p>
            ) : null}
            {step2Options.map((option) => {
              const Icon = option.icon;
              const selected = accountMode === option.mode;
              return (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => setAccountMode(option.mode)}
                  className={`w-full rounded-3xl border-2 bg-white p-6 text-left md:p-10 ${
                    selected ? 'border-brand bg-[#f5fbfc]' : 'border-outline'
                  }`}
                >
                  <div className="flex items-center gap-4 md:gap-8">
                    <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand md:h-24 md:w-24">
                      <Icon className="h-8 w-8 md:h-10 md:w-10" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-black text-ink">{option.title}</h3>
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${option.badgeClass}`}>{option.badge}</span>
                      </div>
                      <p className="mt-2 text-sm text-ink-muted md:text-base">{option.subtitle}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm italic text-ink-subtle md:text-base">
                        {option.points.map((point) => (
                          <span key={point} className="inline-flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-brand md:h-5 md:w-5" /> {point}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span
                      className={`h-8 w-8 shrink-0 rounded-full border-2 ${
                        selected ? 'border-brand bg-brand' : 'border-outline bg-transparent'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-8 flex max-w-5xl flex-col gap-3 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={goToPreviousStep}
              className="w-full rounded-3xl border border-outline bg-white px-7 py-4 text-sm font-bold text-ink md:w-auto"
            >
              {t('post.actions.back')}
            </button>
            <button
              onClick={handleAccountModeContinue}
              disabled={loading || !accountMode}
              className="w-full rounded-3xl bg-brand px-7 py-4 text-sm font-bold text-white md:w-auto md:min-w-[360px] md:px-12 md:py-5 md:text-base disabled:opacity-60"
            >
              {t('auth.signUp.continueToProfile')} <ArrowRight className="ml-2 inline-block h-5 w-5 md:h-6 md:w-6" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef1f4]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <aside className="hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(219,233,240,0.9)_35%,_rgba(193,214,226,0.95)_100%)] p-12 lg:flex lg:flex-col lg:justify-between">
          <BrandMark subtitle={t('auth.signUp.trustedLocalWork')} size="lg" />

          <div className="mx-auto max-w-xl">
            <span className="inline-flex rounded-full bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#1e6d8a]">
              {t('auth.signUp.startEarningTodayBadge')}
            </span>
            <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-tight text-[#10243a]">
              {t('auth.signUp.heroHeadline')}
            </h1>
            <p className="mt-6 text-lg leading-8 text-[#556a84]">
              {t('auth.signUp.heroBody')}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              [t('auth.signUp.featureVerifiedTitle'), t('auth.signUp.featureVerifiedBody')],
              [t('auth.signUp.featureHiredTitle'), t('auth.signUp.featureHiredBody')],
              [t('auth.signUp.featureReputationTitle'), t('auth.signUp.featureReputationBody')],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-soft backdrop-blur">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#1e6d8a]">{title}</p>
                <p className="mt-3 text-sm leading-6 text-[#5e728b]">{body}</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="w-full lg:flex lg:items-center lg:justify-center lg:p-10">
          {step === 1 || step === 3 ? (
            <div className="border-b border-outline bg-[#eef1f4]/80 px-4 py-4 backdrop-blur-md lg:hidden">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => (step === 3 ? goToPreviousStep() : router.back())}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <BrandMark size="sm" />
                <span className="inline-block h-10 w-10" />
              </div>
            </div>
          ) : null}

          <div className={`w-full px-4 pb-8 pt-4 lg:max-w-[640px] lg:rounded-3xl lg:border lg:border-outline lg:bg-white lg:p-10 lg:shadow-sm ${step === 1 ? 'pb-32 lg:pb-8' : ''}`}>
            <div className="mb-6 hidden lg:block">
              <div className="mb-2 flex items-center justify-between text-sm font-bold uppercase tracking-wide text-ink-muted">
                <span>
                  {t('dashboard.step')} {step} {t('common.of')} 3
                </span>
                <span>
                  {profileProgress}% {t('auth.signUp.profileCompletedLower')}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#dce3e8]">
                <div className="h-2 rounded-full bg-brand transition-all" style={{ width: progressWidth }} />
              </div>
            </div>

            {error &&
            !getFieldError('fullName') &&
            !getFieldError('email') &&
            !getFieldError('phoneNumber') &&
            !getFieldError('password') &&
            !getFieldError('acceptedTerms') &&
            !getFieldError('location') ? (
              <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
            ) : null}

            {step === 1 ? (
              <>
                <div className="mb-7 lg:hidden">
                  <div className="mb-2 flex items-end justify-between gap-3">
                    <h1 className="max-w-[240px] text-lg font-semibold leading-tight text-ink">{t('auth.signUp.stepsAwayHeadline')}</h1>
                    <span className="rounded-md bg-brand-soft px-2 py-1 text-sm font-bold text-brand">
                      {t('dashboard.step')} 1 {t('common.of')} 3
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#dce3e8]">
                    <div className="h-2 rounded-full bg-brand transition-all" style={{ width: progressWidth }} />
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">
                    {profileProgress}% {t('dashboard.complete')}
                  </p>
                </div>

                <h1 className="hidden text-2xl font-black leading-tight text-ink lg:block lg:text-3xl">
                  {t('auth.signUp.stepsAwayHeadline')}
                </h1>
                <p className="hidden mt-3 text-sm text-ink-muted lg:block lg:text-base">{t('auth.signUp.joinIntro')}</p>

                <p className="mb-2 mt-2 text-sm font-semibold text-ink lg:hidden">{t('auth.signUp.registerAsPrompt')}</p>

                <div className="mt-2 inline-flex h-12 w-full rounded-xl bg-[#e2e8eb] p-1 lg:mt-7 lg:rounded-xl lg:bg-[#eef3f5] lg:p-1">
                  <button
                    type="button"
                    onClick={() => setUserType('PERSONAL')}
                    className={`h-full w-1/2 rounded-lg px-2 text-sm font-medium lg:rounded-lg lg:text-sm lg:font-bold lg:text-base ${
                      userType === 'PERSONAL' ? 'bg-white text-brand shadow-sm' : 'text-ink-subtle'
                    }`}
                  >
                    <span className="lg:hidden">{t('common.worker')}</span>
                    <span className="hidden lg:inline">{t('auth.signUp.individual')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('ENTERPRISE')}
                    className={`h-full w-1/2 rounded-lg px-2 text-sm font-medium lg:rounded-lg lg:text-sm lg:font-bold lg:text-base ${
                      userType === 'ENTERPRISE' ? 'bg-white text-brand shadow-sm' : 'text-ink-subtle'
                    }`}
                  >
                    <span className="lg:hidden">{t('auth.signUp.employer')}</span>
                    <span className="hidden lg:inline">{t('footer.company')}</span>
                  </button>
                </div>

                <div className="mt-4 space-y-4 lg:mt-6">
                      <label className="block">
                        {getFieldError('fullName') ? (
                          <span className="mb-2 ml-1 block text-sm font-semibold text-red-700">{getFieldError('fullName')}</span>
                        ) : null}
                        <span className="mb-1.5 ml-1 block text-sm font-medium text-ink lg:text-sm lg:font-bold">{t('auth.signUp.fullNameLabel')}</span>
                        <div
                          className={`relative flex items-center rounded-xl border bg-white shadow-sm lg:rounded-xl ${
                            getFieldError('fullName') ? 'border-red-300 bg-red-50/30' : 'border-outline'
                          }`}
                        >
                          <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
                          <input
                            value={accountForm.fullName}
                            onChange={(e) => setAccountForm((prev) => ({ ...prev, fullName: e.target.value }))}
                            className="h-14 w-full border-none bg-transparent pl-12 pr-4 text-sm text-ink outline-none placeholder:text-ink-subtle lg:text-base"
                            placeholder={t('auth.signUp.fullNamePlaceholder')}
                          />
                        </div>
                      </label>

                      <label className="block">
                        {getFieldError('email') ? (
                          <span className="mb-2 ml-1 block text-sm font-semibold text-red-700">{getFieldError('email')}</span>
                        ) : null}
                        <span className="mb-1.5 ml-1 block text-sm font-medium text-ink lg:text-sm lg:font-bold">{t('auth.signUp.emailAddressLabel')}</span>
                        <div
                          className={`relative flex items-center rounded-xl border bg-white shadow-sm lg:rounded-xl ${
                            getFieldError('email') ? 'border-red-300 bg-red-50/30' : 'border-outline'
                          }`}
                        >
                          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
                          <input
                            type="email"
                            value={accountForm.email}
                            onChange={(e) => setAccountForm((prev) => ({ ...prev, email: e.target.value }))}
                            className="h-14 w-full border-none bg-transparent pl-12 pr-4 text-sm text-ink outline-none placeholder:text-ink-subtle lg:text-base"
                            placeholder={t('auth.signUp.emailPlaceholder')}
                          />
                        </div>
                      </label>

                      <label className="block">
                        {getFieldError('phoneNumber') ? (
                          <span className="mb-2 ml-1 block text-sm font-semibold text-red-700">{getFieldError('phoneNumber')}</span>
                        ) : null}
                        <span className="mb-1.5 ml-1 block text-sm font-medium text-ink lg:text-sm lg:font-bold">{t('profile.phoneNumber')}</span>
                        <div
                          className={`relative flex items-center rounded-xl border bg-white shadow-sm lg:rounded-xl ${
                            getFieldError('phoneNumber') ? 'border-red-300 bg-red-50/30' : 'border-outline'
                          }`}
                        >
                          <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
                          <input
                            value={accountForm.phoneNumber}
                            onChange={(e) => setAccountForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                            className="h-14 w-full border-none bg-transparent pl-12 pr-4 text-sm text-ink outline-none placeholder:text-ink-subtle lg:text-base"
                            placeholder={t('auth.signUp.phonePlaceholder')}
                          />
                        </div>
                      </label>

                      <label className="block">
                        {getFieldError('password') ? (
                          <span className="mb-2 ml-1 block text-sm font-semibold text-red-700">{getFieldError('password')}</span>
                        ) : null}
                        <span className="mb-1.5 ml-1 block text-sm font-medium text-ink lg:text-sm lg:font-bold">{t('auth.signUp.password')}</span>
                        <div
                          className={`relative flex items-center rounded-xl border bg-white shadow-sm lg:rounded-xl ${
                            getFieldError('password') ? 'border-red-300 bg-red-50/30' : 'border-outline'
                          }`}
                        >
                          <Shield className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={accountForm.password}
                            onChange={(e) => setAccountForm((prev) => ({ ...prev, password: e.target.value }))}
                            className="h-14 w-full border-none bg-transparent pl-12 pr-12 text-sm text-ink outline-none placeholder:text-ink-subtle lg:text-base"
                            placeholder="••••••••"
                          />
                          <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-subtle">
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </label>
                    </div>

                    <label className="relative mt-2 flex items-start gap-3 py-2 text-sm text-ink-muted lg:mt-5 lg:items-center lg:text-sm">
                      {getFieldError('acceptedTerms') ? (
                        <span className="absolute -mt-7 ml-1 text-sm font-semibold text-red-700">{getFieldError('acceptedTerms')}</span>
                      ) : null}
                      <input
                        type="checkbox"
                        checked={accountForm.acceptedTerms}
                        onChange={(e) => setAccountForm((prev) => ({ ...prev, acceptedTerms: e.target.checked }))}
                        className="mt-0.5 h-5 w-5 rounded border-outline lg:mt-0"
                      />
                      <div className="text-sm text-ink-muted">
                      {t('auth.signUp.agreeToThePrefix')} <Link href="/terms" className="font-bold text-brand underline">{t('footer.terms')}</Link> {t('auth.signUp.and')}{' '}
                      <Link href="/privacy" className="font-bold text-brand underline">{t('footer.privacy')}</Link>.
                      </div>
                    </label>

                    <button
                      onClick={() => handleAccountCreation(false)}
                      disabled={loading}
                      className="mt-7 hidden w-full rounded-2xl bg-brand px-6 py-4 text-sm font-bold text-white lg:block lg:text-base disabled:opacity-60"
                    >
                      {t('auth.signUp.createAccountButton')} <ArrowRight className="ml-2 inline-block h-5 w-5" />
                    </button>

                    <button
                      onClick={() => handleAccountCreation(true)}
                      disabled={loading}
                      className="mt-3 hidden w-full rounded-2xl border border-outline bg-white px-6 py-4 text-base font-semibold text-ink lg:block disabled:opacity-60"
                    >
                      {t('auth.signUp.continueWithGoogle')}
                    </button>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <div className="mb-6 lg:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="max-w-[70%] text-[2rem] font-black leading-[1.15] text-ink">{t('auth.signUp.completeProfileTitle')}</h1>
                    <span className="mt-1 rounded-2xl bg-brand-soft px-3 py-2 text-[1rem] font-bold text-brand">
                      {t('dashboard.step')} 3 {t('common.of')} 3
                    </span>
                  </div>
                  <div className="mt-4 h-3 rounded-full bg-[#dce3e8]">
                    <div className="h-3 rounded-full bg-brand transition-all" style={{ width: progressWidth }} />
                  </div>
                  <p className="mt-2 text-[1rem] text-ink-muted">
                    {profileProgress}% {t('dashboard.complete')}
                  </p>
                </div>

                <h1 className="hidden text-2xl font-black leading-tight text-ink lg:block lg:text-3xl">{t('auth.signUp.completeProfileTitle')}</h1>
                <p className="mt-3 text-sm text-ink-muted lg:text-base">
                  {selectedShape?.profileTier === 'EXTENDED'
                    ? t('auth.signUp.extendedProfileSubtitle')
                    : t('auth.signUp.basicProfileSubtitle')}
                </p>

                  <div className="mt-6 rounded-2xl border border-outline bg-white p-4 lg:mt-7 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
                  <div className="space-y-4">
                  <label className="block">
                    {getFieldError('location') ? (
                      <span className="mb-2 block text-sm font-semibold text-red-700">{getFieldError('location')}</span>
                    ) : null}
                    <span className="mb-2 block text-sm font-bold text-ink">{t('auth.signUp.currentLocationLabel')}</span>
                    <LocationPicker
                      value={{ lat: profileForm.latitude ?? 0, lng: profileForm.longitude ?? 0, address: profileForm.location }}
                      onChange={({ lat, lng, address }) => {
                        setProfileForm((prev) => ({ ...prev, location: address, latitude: lat, longitude: lng }));
                      }}
                      addressPlaceholder={t('post.labels.locationPlaceholder')}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-ink">{t('auth.signUp.bioLabel')}</span>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                      className="w-full rounded-2xl border border-outline px-4 py-3 text-sm text-ink outline-none lg:rounded-xl lg:text-base"
                      rows={4}
                      placeholder={t('auth.signUp.bioPlaceholder')}
                    />
                  </label>

                  {selectedShape?.profileTier === 'EXTENDED' ? (
                    <>
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-ink">{t('auth.signUp.primarySkillLabel')}</span>
                        <input
                          value={profileForm.primarySkill}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, primarySkill: e.target.value }))}
                          className="w-full rounded-full border border-outline px-4 py-3 text-sm text-ink outline-none lg:rounded-xl lg:text-base"
                          placeholder={t('auth.signUp.primarySkillPlaceholder')}
                        />
                      </label>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-ink">{t('postOptions.budgetType.HOURLY')}</span>
                          <div className="grid grid-cols-[minmax(0,1fr)_180px] gap-2">
                            <input
                              value={profileForm.hourlyRate}
                              onChange={(e) => setProfileForm((prev) => ({ ...prev, hourlyRate: e.target.value }))}
                              className="w-full rounded-full border border-outline px-4 py-3 text-sm text-ink outline-none lg:rounded-xl lg:text-base"
                              placeholder="45"
                            />
                            <CurrencySelector
                              value={profileForm.hourlyRateCurrency}
                              onChange={(currency) => setProfileForm((prev) => ({ ...prev, hourlyRateCurrency: currency }))}
                            />
                          </div>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-ink">{t('auth.signUp.serviceRadiusLabel')}</span>
                          <input
                            value={profileForm.serviceRadiusKm}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, serviceRadiusKm: e.target.value }))}
                            className="w-full rounded-full border border-outline px-4 py-3 text-sm text-ink outline-none lg:rounded-xl lg:text-base"
                            placeholder="10"
                          />
                        </label>
                      </div>
                    </>
                  ) : null}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 lg:mt-7 lg:flex-row lg:justify-end">
                  <button
                    type="button"
                    onClick={goToPreviousStep}
                    className="w-full rounded-full border border-outline bg-white px-6 py-3 text-sm font-bold text-ink lg:w-auto lg:rounded-2xl"
                  >
                    {t('post.actions.back')}
                  </button>
                  <button
                    onClick={handleProfileComplete}
                    disabled={loading}
                    className="w-full rounded-full bg-brand px-6 py-4 text-sm font-bold text-white lg:w-auto lg:rounded-2xl lg:text-base disabled:opacity-60"
                  >
                    {t('auth.signUp.finishAndSearch')} <ArrowRight className="ml-2 inline-block h-5 w-5" />
                  </button>
                </div>
              </>
            ) : null}

            <div className={`mt-6 text-center text-[1rem] text-ink-muted lg:text-sm lg:text-base ${step === 1 ? 'hidden lg:block' : ''}`}>
              {t('auth.signUp.haveAccount')}{' '}
              <Link href="/signin" className="font-bold text-brand">{t('auth.signUp.logIn')}</Link>
            </div>
          </div>
        </main>
      </div>
      {step === 1 ? (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#eef1f4] via-[#eef1f4]/95 to-transparent p-4 lg:hidden">
          <div className="mx-auto w-full max-w-md">
            <button
              onClick={() => handleAccountCreation(false)}
              disabled={loading}
              className="w-full rounded-xl bg-brand py-4 text-base font-bold text-white shadow-lg shadow-[0_18px_40px_rgba(30,109,138,0.18)]"
            >
              {t('auth.signUp.createAccountButton')} <ArrowRight className="ml-2 inline-block h-5 w-5" />
            </button>
            <p className="mt-3 text-center text-xs text-ink-muted">
              {t('auth.signUp.haveAccount')} <Link href="/signin" className="font-bold text-brand">{t('auth.signUp.logInCaps')}</Link>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
