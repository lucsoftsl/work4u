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
    bio: '',
    primarySkill: '',
    hourlyRate: '',
    serviceRadiusKm: '',
  });

  const selectedShape = useMemo(() => (accountMode ? deriveProfileShape(accountMode) : null), [accountMode]);
  const getErrorMessage = (value: unknown): string => (value instanceof Error ? value.message : 'Unknown error');
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
      if (!accountForm.fullName.trim()) return setError('Full name is required.');
      if (!accountForm.email.trim()) return setError('Email is required.');
      if (!accountForm.phoneNumber.trim()) return setError('Phone number is required.');
      if (!accountForm.password.trim()) return setError('Password is required.');
      if (accountForm.password.length < 8) return setError('Password must be at least 8 characters.');
      if (!accountForm.acceptedTerms) return setError('You must accept Terms and Privacy Policy.');
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
        setError(getErrorMessage(err) || 'Failed to continue signup.');
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
          setError(getErrorMessage(resumeErr) || 'Failed to continue signup.');
          return;
        }
      }
      setError(getErrorMessage(err) || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountModeContinue = async () => {
    if (!accountUser || !accountMode || !selectedShape) {
      setError('Select one account mode to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await completeSignupStep2(accountMode);
      setStep(3);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to save account mode.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = async () => {
    if (!accountUser || !accountMode || !selectedShape) return;

    if (!accountForm.fullName.trim()) return setError('Full name is required.');
    if (!profileForm.location.trim()) return setError('Location is required.');

    setLoading(true);
    setError(null);

    try {
      await completeSignupStep3({
        displayName: accountForm.fullName.trim(),
        phoneNumber: accountForm.phoneNumber.trim(),
        location: profileForm.location.trim(),
        bio: profileForm.bio.trim() || undefined,
        primarySkill: profileForm.primarySkill.trim() || undefined,
        hourlyRate: profileForm.hourlyRate.trim() || undefined,
        serviceRadiusKm: profileForm.serviceRadiusKm.trim() || undefined,
      });

      router.push('/jobs');
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to complete profile.');
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
      title: 'Skill Requester',
      badge: 'CLIENT STAR',
      badgeClass: 'border-amber-300 bg-amber-100 text-amber-700',
      subtitle: 'Hire top talent for your projects and manage workflows effortlessly.',
      icon: BriefcaseBusiness,
      points: ['Access to 10k+ experts', 'Secure payments'],
    },
    {
      mode: 'WORKER' as const,
      title: 'Skill Worker',
      badge: 'EXPERT BADGE',
      badgeClass: 'border-blue-300 bg-blue-100 text-blue-700',
      subtitle: 'Offer your services and grow your career with our global client base.',
      icon: Wrench,
      points: ['Lower platform fees', 'XP rewards & levels'],
    },
    {
      mode: 'BOTH' as const,
      title: 'Both',
      badge: 'VERSATILE PRO',
      badgeClass: 'border-purple-300 bg-purple-100 text-purple-700',
      subtitle: 'The best of both worlds. Switch seamlessly between hiring and working.',
      icon: Building2,
      points: ['Full platform access', 'Unified dashboard'],
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
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <span className="text-sm font-bold text-ink-muted">Role Selection</span>
          </div>

          <div className="mx-auto mb-12 max-w-5xl">
            <div className="mb-3 flex items-center justify-between text-sm font-bold">
              <span className="uppercase tracking-[0.15em] text-brand">Step 2 of 3</span>
              <span className="text-ink-muted">{profileProgress}% Profile Completed</span>
            </div>
            <div className="h-3 rounded-full bg-[#dce3e8]">
              <div className="h-3 rounded-full bg-brand transition-all" style={{ width: progressWidth }} />
            </div>
          </div>

          <div className="mx-auto mb-10 max-w-4xl text-center">
            <h1 className="text-3xl font-black leading-tight text-ink md:text-4xl">Choose your path to earn rewards</h1>
            <p className="mx-auto mt-4 max-w-3xl text-sm text-ink-muted md:text-base">
              Select the account type that best fits your goals. You can always expand your profile later.
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
              Back
            </button>
            <button
              onClick={handleAccountModeContinue}
              disabled={loading || !accountMode}
              className="w-full rounded-3xl bg-brand px-7 py-4 text-sm font-bold text-white md:w-auto md:min-w-[360px] md:px-12 md:py-5 md:text-base disabled:opacity-60"
            >
              Continue to Profile <ArrowRight className="ml-2 inline-block h-5 w-5 md:h-6 md:w-6" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef1f4]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <aside className="hidden bg-[#e6ecef] p-10 lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-3xl font-black text-ink">
            <Shield className="h-8 w-8" /> Work4U
          </Link>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-3xl font-black leading-tight text-ink lg:text-4xl">Empowering the world&apos;s best talent.</h2>
            <p className="mt-6 text-base text-ink-muted lg:text-lg">Join professionals and companies building the future together.</p>
          </div>
          <div />
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
                <span className="text-xl font-bold tracking-tight text-brand">Work4U</span>
                <span className="inline-block h-10 w-10" />
              </div>
            </div>
          ) : null}

          <div className={`w-full px-4 pb-8 pt-4 lg:max-w-[640px] lg:rounded-3xl lg:border lg:border-outline lg:bg-white lg:p-10 lg:shadow-sm ${step === 1 ? 'pb-32 lg:pb-8' : ''}`}>
            <div className="mb-6 hidden lg:block">
              <div className="mb-2 flex items-center justify-between text-sm font-bold uppercase tracking-wide text-ink-muted">
                <span>Step {step} of 3</span>
                <span>{profileProgress}% profile completed</span>
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
                    <h1 className="max-w-[240px] text-lg font-semibold leading-tight text-ink">You&apos;re 3 steps away from unlocking your earning potential!</h1>
                    <span className="rounded-md bg-brand-soft px-2 py-1 text-sm font-bold text-brand">Step 1 of 3</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#dce3e8]">
                    <div className="h-2 rounded-full bg-brand transition-all" style={{ width: progressWidth }} />
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">{profileProgress}% Complete</p>
                </div>

                <h1 className="hidden text-2xl font-black leading-tight text-ink lg:block lg:text-3xl">
                  You&apos;re 3 steps away from unlocking your earning potential!
                </h1>
                <p className="hidden mt-3 text-sm text-ink-muted lg:block lg:text-base">Join Work4U to start collaborating with the best talent.</p>

                <p className="mb-2 mt-2 text-sm font-semibold text-ink lg:hidden">I want to register as a:</p>

                <div className="mt-2 inline-flex h-12 w-full rounded-xl bg-[#e2e8eb] p-1 lg:mt-7 lg:rounded-xl lg:bg-[#eef3f5] lg:p-1">
                  <button
                    type="button"
                    onClick={() => setUserType('PERSONAL')}
                    className={`h-full w-1/2 rounded-lg px-2 text-sm font-medium lg:rounded-lg lg:text-sm lg:font-bold lg:text-base ${
                      userType === 'PERSONAL' ? 'bg-white text-brand shadow-sm' : 'text-ink-subtle'
                    }`}
                  >
                    <span className="lg:hidden">Worker</span>
                    <span className="hidden lg:inline">Individual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('ENTERPRISE')}
                    className={`h-full w-1/2 rounded-lg px-2 text-sm font-medium lg:rounded-lg lg:text-sm lg:font-bold lg:text-base ${
                      userType === 'ENTERPRISE' ? 'bg-white text-brand shadow-sm' : 'text-ink-subtle'
                    }`}
                  >
                    <span className="lg:hidden">Employer</span>
                    <span className="hidden lg:inline">Company</span>
                  </button>
                </div>

                {userType === 'ENTERPRISE' ? (
                  <div className="mt-4 rounded-[2rem] border border-outline bg-[#f7fbfc] p-6 text-center shadow-soft lg:mt-6 lg:p-10">
                    <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                      <Building2 className="h-8 w-8" />
                    </span>
                    <h2 className="mt-5 text-2xl font-black text-ink lg:text-3xl">Company sign-up is coming soon</h2>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-muted lg:text-base">
                      We&apos;re still shaping the best onboarding flow for companies. For now, individual accounts are available and company registration will land soon.
                    </p>
                    <div className="mt-6 inline-flex rounded-full bg-brand-soft px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand">
                      Coming soon
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 space-y-4 lg:mt-6">
                      <label className="block">
                        {getFieldError('fullName') ? (
                          <span className="mb-2 ml-1 block text-sm font-semibold text-red-700">{getFieldError('fullName')}</span>
                        ) : null}
                        <span className="mb-1.5 ml-1 block text-sm font-medium text-ink lg:text-sm lg:font-bold">Full Name</span>
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
                            placeholder="e.g. John Doe"
                          />
                        </div>
                      </label>

                      <label className="block">
                        {getFieldError('email') ? (
                          <span className="mb-2 ml-1 block text-sm font-semibold text-red-700">{getFieldError('email')}</span>
                        ) : null}
                        <span className="mb-1.5 ml-1 block text-sm font-medium text-ink lg:text-sm lg:font-bold">Email Address</span>
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
                            placeholder="name@example.com"
                          />
                        </div>
                      </label>

                      <label className="block">
                        {getFieldError('phoneNumber') ? (
                          <span className="mb-2 ml-1 block text-sm font-semibold text-red-700">{getFieldError('phoneNumber')}</span>
                        ) : null}
                        <span className="mb-1.5 ml-1 block text-sm font-medium text-ink lg:text-sm lg:font-bold">Phone Number</span>
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
                            placeholder="+1 (555) 000-0000"
                          />
                        </div>
                      </label>

                      <label className="block">
                        {getFieldError('password') ? (
                          <span className="mb-2 ml-1 block text-sm font-semibold text-red-700">{getFieldError('password')}</span>
                        ) : null}
                        <span className="mb-1.5 ml-1 block text-sm font-medium text-ink lg:text-sm lg:font-bold">Password</span>
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
                      I agree to the <Link href="/terms" className="font-bold text-brand underline">Terms & Conditions</Link> and{' '}
                      <Link href="/privacy" className="font-bold text-brand underline">Privacy Policy</Link>.
                      </div>
                    </label>

                    <button
                      onClick={() => handleAccountCreation(false)}
                      disabled={loading}
                      className="mt-7 hidden w-full rounded-2xl bg-brand px-6 py-4 text-sm font-bold text-white lg:block lg:text-base disabled:opacity-60"
                    >
                      Create Account <ArrowRight className="ml-2 inline-block h-5 w-5" />
                    </button>

                    <button
                      onClick={() => handleAccountCreation(true)}
                      disabled={loading}
                      className="mt-3 hidden w-full rounded-2xl border border-outline bg-white px-6 py-4 text-base font-semibold text-ink lg:block disabled:opacity-60"
                    >
                      Continue with Google
                    </button>
                  </>
                )}
              </>
            ) : null}

            {step === 3 ? (
              <>
                <div className="mb-6 lg:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="max-w-[70%] text-[2rem] font-black leading-[1.15] text-ink">Complete your profile</h1>
                    <span className="mt-1 rounded-2xl bg-brand-soft px-3 py-2 text-[1rem] font-bold text-brand">Step 3 of 3</span>
                  </div>
                  <div className="mt-4 h-3 rounded-full bg-[#dce3e8]">
                    <div className="h-3 rounded-full bg-brand transition-all" style={{ width: progressWidth }} />
                  </div>
                  <p className="mt-2 text-[1rem] text-ink-muted">{profileProgress}% Complete</p>
                </div>

                <h1 className="hidden text-2xl font-black leading-tight text-ink lg:block lg:text-3xl">Complete your profile</h1>
                <p className="mt-3 text-sm text-ink-muted lg:text-base">
                  {selectedShape?.profileTier === 'EXTENDED'
                    ? 'Provide profile details so clients can discover and trust your services.'
                    : 'Add your basic details and start requesting services.'}
                </p>

                  <div className="mt-6 rounded-2xl border border-outline bg-white p-4 lg:mt-7 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
                  <div className="space-y-4">
                  <label className="block">
                    {getFieldError('location') ? (
                      <span className="mb-2 block text-sm font-semibold text-red-700">{getFieldError('location')}</span>
                    ) : null}
                    <span className="mb-2 block text-sm font-bold text-ink">Current Location</span>
                    <input
                      value={profileForm.location}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, location: e.target.value }))}
                      className={`w-full rounded-full border px-4 py-3 text-sm text-ink outline-none lg:rounded-xl lg:text-base ${
                        getFieldError('location') ? 'border-red-300 bg-red-50/30' : 'border-outline'
                      }`}
                      placeholder="City, State"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-ink">Bio</span>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                      className="w-full rounded-2xl border border-outline px-4 py-3 text-sm text-ink outline-none lg:rounded-xl lg:text-base"
                      rows={4}
                      placeholder="Tell us about yourself"
                    />
                  </label>

                  {selectedShape?.profileTier === 'EXTENDED' ? (
                    <>
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-ink">Primary Skill</span>
                        <input
                          value={profileForm.primarySkill}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, primarySkill: e.target.value }))}
                          className="w-full rounded-full border border-outline px-4 py-3 text-sm text-ink outline-none lg:rounded-xl lg:text-base"
                          placeholder="Plumbing, Design, Delivery..."
                        />
                      </label>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-ink">Hourly Rate (USD)</span>
                          <input
                            value={profileForm.hourlyRate}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, hourlyRate: e.target.value }))}
                            className="w-full rounded-full border border-outline px-4 py-3 text-sm text-ink outline-none lg:rounded-xl lg:text-base"
                            placeholder="45"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-ink">Service Radius (km)</span>
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
                    Back
                  </button>
                  <button
                    onClick={handleProfileComplete}
                    disabled={loading}
                    className="w-full rounded-full bg-brand px-6 py-4 text-sm font-bold text-white lg:w-auto lg:rounded-2xl lg:text-base disabled:opacity-60"
                  >
                    Finish and Go to Search <ArrowRight className="ml-2 inline-block h-5 w-5" />
                  </button>
                </div>
              </>
            ) : null}

            <div className={`mt-6 text-center text-[1rem] text-ink-muted lg:text-sm lg:text-base ${step === 1 ? 'hidden lg:block' : ''}`}>
              Already have an account?{' '}
              <Link href="/signin" className="font-bold text-brand">Log in</Link>
            </div>
          </div>
        </main>
      </div>
      {step === 1 && userType === 'PERSONAL' ? (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#eef1f4] via-[#eef1f4]/95 to-transparent p-4 lg:hidden">
          <div className="mx-auto w-full max-w-md">
            <button
              onClick={() => handleAccountCreation(false)}
              disabled={loading}
              className="w-full rounded-xl bg-brand py-4 text-base font-bold text-white shadow-lg shadow-[0_18px_40px_rgba(30,109,138,0.18)]"
            >
              Create Account <ArrowRight className="ml-2 inline-block h-5 w-5" />
            </button>
            <p className="mt-3 text-center text-xs text-ink-muted">
              Already have an account? <Link href="/signin" className="font-bold text-brand">Log In</Link>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
