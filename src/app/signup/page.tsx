'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStripCredentialParams } from '@/lib/useStripCredentialParams';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, CheckCircle2, History, Users, Wrench } from 'lucide-react';
import { completeSignupStep2, completeSignupStep3, signUp, signUpWithGoogle, updateUserProfile } from '@/lib/auth-service';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser } from '@/types/auth';
import { CurrencySelector } from '@/components/CurrencySelector';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Textarea } from '@/components/ui/Field';
import { AuthErrorBanner, GoogleIcon, OrDivider, PasswordField, Wordmark } from '@/components/SignIn';
import { useTranslation } from '@/lib/i18n';
import { resumeSignup } from '@/lib/signup-resume';
import { authErrorCode, describeAuthError, isUserFacingMessage } from '@/lib/auth-errors';
import { cn } from '@/lib/utils';

type AccountMode = 'REQUESTOR' | 'WORKER' | 'BOTH';
type Step = 1 | 2 | 3;
type AccountField = 'fullName' | 'email' | 'phoneNumber' | 'password' | 'acceptedTerms';
type FieldErrors = Partial<Record<AccountField | 'location' | 'accountMode', string>>;
type Translate = (key: string) => string;

const STEP_PROGRESS: Record<Step, number> = { 1: 33, 2: 66, 3: 100 };
const STEP_KEYS: Record<Step, { title: string; desc: string }> = {
  1: { title: 'auth.signUp.steps.account.title', desc: 'auth.signUp.steps.account.desc' },
  2: { title: 'auth.signUp.steps.mode.title', desc: 'auth.signUp.steps.mode.desc' },
  3: { title: 'auth.signUp.steps.profile.title', desc: 'auth.signUp.steps.profile.desc' },
};
const ACCOUNT_FIELD_ORDER: AccountField[] = ['fullName', 'email', 'phoneNumber', 'password', 'acceptedTerms'];
const MAP_HEIGHT = 'clamp(160px, 22vw, 320px)';
const LOCATION_INPUT_ID = 'signup-location';
const MIN_PASSWORD_LENGTH = 8;

function stepLabel(t: Translate, step: Step): string {
  return `${t('dashboard.step')} ${step} ${t('common.of')} 3`;
}

function isWorkerMode(mode: AccountMode | null): boolean {
  return mode === 'WORKER' || mode === 'BOTH';
}

function landingPathFor(userType: 'PERSONAL' | 'ENTERPRISE', mode: AccountMode): string {
  if (userType === 'ENTERPRISE') return '/pricing?intent=business';
  if (mode === 'WORKER') return '/jobs';
  if (mode === 'REQUESTOR') return '/post-job';
  return '/dashboard';
}

/* ------------------------------------------------------------------ */
/* Layout pieces                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-sunken" aria-hidden="true">
      <div
        className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-normal ease-out"
        style={{ transform: `scaleX(${STEP_PROGRESS[step] / 100})` }}
      />
    </div>
  );
}

function StepHeader({ step, t }: { step: Step; t: Translate }) {
  return (
    <div className="mb-6 hidden md:block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-micro uppercase text-ink-muted">{stepLabel(t, step)}</p>
        <p className="text-caption font-bold text-primary">
          {STEP_PROGRESS[step]}% {t('auth.signUp.progressComplete')}
        </p>
      </div>
      <ProgressBar step={step} />
    </div>
  );
}

interface ShellProps {
  step: Step | null;
  backLabel: string;
  onBack?: () => void;
  t: Translate;
  children: React.ReactNode;
}

/** Chromeless signup frame: mobile top bar (back · wordmark · step) + progress, wordmark row from md. */
function SignupShell({ step, backLabel, onBack, t, children }: ShellProps) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas">
      <div className="border-b border-line bg-surface md:hidden">
        <div className="flex h-14 items-center gap-2 px-2">
          {onBack ? (
            <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label={backLabel} className="text-ink">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
          ) : (
            <span className="w-2" aria-hidden="true" />
          )}
          <Wordmark />
          {step ? <p className="ml-auto pr-2 text-micro uppercase text-ink-muted">{stepLabel(t, step)}</p> : null}
        </div>
        {step ? <ProgressBar step={step} /> : null}
      </div>
      <div className="hidden h-16 items-center px-[var(--gutter)] md:flex lg:px-10">
        <Wordmark />
      </div>
      <div className="px-[var(--gutter)] pb-12 pt-6 md:pt-4">{children}</div>
    </div>
  );
}

const CARD = 'md:rounded-card md:border md:border-line md:bg-surface md:p-8 md:shadow-stamp';

function StepList({ current, t, completedThrough }: { current: Step | null; completedThrough: number; t: Translate }) {
  return (
    <ol className="space-y-3">
      {([1, 2, 3] as const).map((n) => {
        const done = n <= completedThrough;
        const isCurrent = n === current;
        const status = done ? t('auth.signUp.resume.completed') : isCurrent ? t('auth.signUp.resume.current') : t('auth.signUp.resume.pending');
        return (
          <li
            key={n}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'flex items-start gap-3 rounded-control border p-3',
              isCurrent ? 'border-2 border-primary bg-surface' : done ? 'border-line bg-sunken' : 'border-line bg-surface'
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control font-display text-label',
                done ? 'bg-primary text-on-fill' : isCurrent ? 'bg-primary-soft text-primary' : 'bg-sunken text-ink-muted'
              )}
            >
              {done ? <Check className="h-4 w-4" /> : n}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className={cn('text-label', isCurrent ? 'text-primary' : 'text-ink')}>{t(STEP_KEYS[n].title)}</span>
                <span className={cn('text-caption font-bold', done ? 'text-success' : isCurrent ? 'text-primary' : 'text-ink-subtle')}>
                  {status}
                </span>
              </span>
              <span className="block text-caption text-ink-muted">{t(STEP_KEYS[n].desc)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser, signOut } = useAuth();
  const { t } = useTranslation();
  useStripCredentialParams();

  const [step, setStep] = useState<Step>(1);
  const [showResume, setShowResume] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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

  const authResolvedRef = useRef(false);
  const fieldRefs = {
    fullName: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    phoneNumber: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    acceptedTerms: useRef<HTMLInputElement>(null),
  };
  const firstModeRef = useRef<HTMLInputElement>(null);
  const locationWrapRef = useRef<HTMLDivElement>(null);

  const busy = loading || googleLoading;
  const workerFields = isWorkerMode(accountMode);

  /** Focus after the error text has rendered so aria-describedby already points at it. */
  const focusLater = (el: () => HTMLElement | null | undefined) => {
    requestAnimationFrame(() => el()?.focus());
  };

  const getErrorMessage = (value: unknown): string => {
    if (authErrorCode(value)) return t(describeAuthError(value).key);
    if (value instanceof Error && isUserFacingMessage(value.message)) return value.message;
    return t('auth.signUp.error.unknown');
  };

  /** Shows an auth failure on its field when it has one (e.g. email in use), otherwise in the banner. */
  const showFailure = (value: unknown, fallbackKey: string) => {
    const info = authErrorCode(value) ? describeAuthError(value) : null;
    if (info?.field) {
      const field = info.field === 'email' ? 'email' : 'password';
      setFieldErrors({ [field]: t(info.key) });
      focusLater(() => fieldRefs[field].current);
      return;
    }
    setError(getErrorMessage(value) || t(fallbackKey));
  };

  const isFirebaseEmailExistsError = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    const maybeCode = (value as { code?: unknown }).code;
    return typeof maybeCode === 'string' && maybeCode.includes('email-already-in-use');
  };

  useEffect(() => {
    if (authLoading) return;
    // Only a session that existed when the page opened is a "resume"; users created in this visit keep going.
    const arrivedSignedIn = !authResolvedRef.current && !!user;
    authResolvedRef.current = true;
    if (!user) return;

    setAccountUser(user);
    const resume = resumeSignup(user);
    if (resume.kind === 'done') {
      router.replace('/dashboard');
      return;
    }
    setStep(resume.step);
    if (arrivedSignedIn) setShowResume(true);

    // Refill what the later steps need after a reload (step 3 re-sends name/phone).
    setAccountForm((prev) => ({
      ...prev,
      fullName: prev.fullName || user.displayName || '',
      email: prev.email || user.email || '',
      phoneNumber: prev.phoneNumber || user.phoneNumber || '',
    }));
    if (user.userType === 'ENTERPRISE') setUserType('ENTERPRISE');
    if (user.accountMode) setAccountMode(user.accountMode);
  }, [user, authLoading, router]);

  // LocationPicker's address input has no label of its own; attach ours and the error to it.
  useEffect(() => {
    if (step !== 3 || showResume) return;
    const input = locationWrapRef.current?.querySelector('input');
    if (!input) return;
    input.id = LOCATION_INPUT_ID;
    input.setAttribute('aria-labelledby', `${LOCATION_INPUT_ID}-label`);
    if (fieldErrors.location) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', `${LOCATION_INPUT_ID}-error`);
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  }, [step, showResume, fieldErrors.location]);

  const clearErrors = () => {
    setError(null);
    setFieldErrors({});
  };

  const updateAccount = <K extends keyof typeof accountForm>(key: K, value: (typeof accountForm)[K]) => {
    setAccountForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const validateAccount = (useGoogle: boolean): FieldErrors => {
    const next: FieldErrors = {};
    if (!useGoogle) {
      if (!accountForm.fullName.trim()) next.fullName = t('auth.signUp.error.fullNameRequired');
      if (!accountForm.email.trim()) next.email = t('auth.signUp.error.emailRequiredField');
      if (!accountForm.phoneNumber.trim()) next.phoneNumber = t('auth.signUp.error.phoneRequired');
      if (!accountForm.password.trim()) next.password = t('auth.signUp.error.passwordRequiredField');
      else if (accountForm.password.length < MIN_PASSWORD_LENGTH) next.password = t('auth.signUp.error.passwordMinLength');
    }
    // Terms gate both Create account and Google (design §6).
    if (!accountForm.acceptedTerms) next.acceptedTerms = t('auth.signUp.error.acceptTerms');
    return next;
  };

  const handleAccountCreation = async (useGoogle: boolean) => {
    clearErrors();

    const invalid = validateAccount(useGoogle);
    const firstInvalid = ACCOUNT_FIELD_ORDER.find((field) => invalid[field]);
    if (firstInvalid) {
      setFieldErrors(invalid);
      focusLater(() => fieldRefs[firstInvalid].current);
      return;
    }

    const cameBackFromLaterStep = step === 1 && (user?.onboardingStep ?? accountUser?.onboardingStep ?? 1) >= 2;
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

    const setBusy = useGoogle ? setGoogleLoading : setLoading;
    setBusy(true);
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
      // The session existed before the backend row did; load it now so reloads resume correctly.
      void refreshUser();
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
          clearErrors();
          setStep(2);
          return;
        } catch (resumeErr: unknown) {
          setError(getErrorMessage(resumeErr) || t('auth.signUp.error.continueFailed'));
          return;
        }
      }
      if (useGoogle && authErrorCode(err) === 'auth/popup-closed-by-user') return;
      showFailure(err, 'auth.signUp.error.createFailed');
    } finally {
      setBusy(false);
    }
  };

  const handleAccountModeContinue = async () => {
    clearErrors();
    if (!accountUser || !accountMode) {
      setFieldErrors({ accountMode: t('auth.signUp.error.selectMode') });
      focusLater(() => firstModeRef.current);
      return;
    }

    setLoading(true);
    try {
      await completeSignupStep2(accountMode);
      setStep(3);
      void refreshUser();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('auth.signUp.error.saveModeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = async () => {
    if (!accountUser || !accountMode) return;
    clearErrors();

    if (!accountForm.fullName.trim()) return setError(t('auth.signUp.error.fullNameRequired'));
    if (!profileForm.location.trim()) {
      setFieldErrors({ location: t('auth.signUp.error.locationRequired') });
      focusLater(() => document.getElementById(LOCATION_INPUT_ID));
      return;
    }

    setLoading(true);
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

      await refreshUser();
      router.push(landingPathFor(userType, accountMode));
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('auth.signUp.error.completeProfileFailed'));
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousStep = () => {
    clearErrors();
    setStep((prev) => (prev === 1 ? 1 : ((prev - 1) as Step)));
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/signin');
  };

  const submitWith = (action: () => Promise<unknown> | void) => (event: React.FormEvent) => {
    event.preventDefault();
    void action();
  };

  const backLabel = t('post.actions.back');
  const banner = error ? <AuthErrorBanner message={error} /> : null;

  /* ---------------- Resume ---------------- */
  if (showResume) {
    return (
      <SignupShell step={null} backLabel={backLabel} t={t}>
        <div className="mx-auto w-full max-w-[560px] space-y-4">
          <section aria-labelledby="resume-heading" className="rounded-card border border-line bg-surface p-5 shadow-stamp md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 rounded-control bg-money-soft px-2 py-1 text-micro uppercase text-money">
                <History className="h-3.5 w-3.5" aria-hidden="true" />
                {t('auth.signUp.resume.eyebrow')}
              </p>
              <p className="text-caption font-bold text-primary">
                {STEP_PROGRESS[(step - 1 || 1) as Step]}% {t('auth.signUp.progressComplete')}
              </p>
            </div>
            <h1 id="resume-heading" className="mt-4 text-h1 text-ink">
              {t('auth.signUp.resume.title')}
            </h1>
            <p className="mt-2 text-body text-ink-muted">{t('auth.signUp.resume.body')}</p>
          </section>

          <section aria-labelledby="resume-steps-heading" className="rounded-card border border-line bg-surface p-5 md:p-8">
            <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-line pb-3">
              <h2 id="resume-steps-heading" className="text-h3 text-ink">
                {t('auth.signUp.resume.checklist')}
              </h2>
              <p className="text-label text-primary">{stepLabel(t, step)}</p>
            </div>
            <StepList current={step} completedThrough={step - 1} t={t} />
          </section>

          <Button type="button" size="lg" className="w-full" onClick={() => setShowResume(false)}>
            {t('common.continue')}
            <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
          </Button>
          <div className="text-center">
            <Button type="button" variant="ghost" onClick={handleSignOut}>
              {t('nav.signOut')}
            </Button>
          </div>
        </div>
      </SignupShell>
    );
  }

  /* ---------------- Step 2: mode ---------------- */
  if (step === 2) {
    const options = [
      { mode: 'REQUESTOR' as const, title: t('auth.signUp.mode.hireTitle'), body: t('auth.signUp.mode.hireBody'), icon: BriefcaseBusiness },
      { mode: 'WORKER' as const, title: t('auth.signUp.mode.workTitle'), body: t('auth.signUp.mode.workBody'), icon: Wrench },
      { mode: 'BOTH' as const, title: t('auth.signUp.bothTitle'), body: t('auth.signUp.mode.bothBody'), icon: Users },
    ];

    return (
      <SignupShell step={2} backLabel={backLabel} onBack={goToPreviousStep} t={t}>
        <form method="post" noValidate onSubmit={submitWith(handleAccountModeContinue)} className={cn('mx-auto w-full max-w-[560px] lg:max-w-[960px]', CARD)}>
          <StepHeader step={2} t={t} />
          <h1 id="mode-heading" className="text-h1 text-ink">
            {t('auth.signUp.modeTitle')}
          </h1>
          <p className="mt-2 text-body text-ink-muted">{t('auth.signUp.modeSubtitle')}</p>

          {banner ? <div className="mt-6">{banner}</div> : null}

          <div
            role="radiogroup"
            aria-labelledby="mode-heading"
            aria-describedby={fieldErrors.accountMode ? 'mode-error' : undefined}
            className="mt-6 grid gap-3 lg:grid-cols-3"
          >
            {options.map((option, index) => {
              const Icon = option.icon;
              const selected = accountMode === option.mode;
              return (
                <label
                  key={option.mode}
                  className={cn(
                    'relative flex cursor-pointer items-start gap-4 rounded-card border-2 p-4 transition-colors duration-fast has-[:focus-visible]:shadow-focus lg:flex-col lg:p-5',
                    selected ? 'border-primary bg-primary-soft' : 'border-line-strong bg-surface hover:border-ink-muted'
                  )}
                >
                  <input
                    ref={index === 0 ? firstModeRef : undefined}
                    type="radio"
                    name="accountMode"
                    value={option.mode}
                    checked={selected}
                    onChange={() => {
                      setAccountMode(option.mode);
                      setFieldErrors((prev) => ({ ...prev, accountMode: undefined }));
                    }}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control',
                      selected ? 'bg-primary text-on-fill' : 'bg-sunken text-primary'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-h3 text-ink">{option.title}</span>
                    <span className="mt-1 block text-body text-ink-muted">{option.body}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 lg:absolute lg:right-5 lg:top-5',
                      selected ? 'border-primary bg-primary text-on-fill' : 'border-line-strong bg-surface'
                    )}
                  >
                    {selected ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                </label>
              );
            })}
          </div>
          {fieldErrors.accountMode ? (
            <p id="mode-error" className="mt-2 text-caption font-bold text-danger">
              {fieldErrors.accountMode}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
            <Button type="button" variant="ghost" onClick={goToPreviousStep} className="hidden md:inline-flex">
              <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
              {backLabel}
            </Button>
            <Button type="submit" size="lg" loading={loading} className="w-full md:w-auto md:min-w-[200px]">
              {t('common.continue')}
              {loading ? null : <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />}
            </Button>
          </div>
        </form>
      </SignupShell>
    );
  }

  /* ---------------- Step 3: profile ---------------- */
  if (step === 3) {
    return (
      <SignupShell step={3} backLabel={backLabel} onBack={goToPreviousStep} t={t}>
        <form method="post" noValidate onSubmit={submitWith(handleProfileComplete)} className={cn('mx-auto w-full max-w-[560px] md:max-w-[720px] xl:max-w-[1040px]', CARD)}>
          <StepHeader step={3} t={t} />
          <h1 className="text-h1 text-ink">{t('auth.signUp.completeProfileTitle')}</h1>
          <p className="mt-2 text-body text-ink-muted">
            {workerFields ? t('auth.signUp.extendedProfileSubtitle') : t('auth.signUp.basicProfileSubtitle')}
          </p>

          {banner ? <div className="mt-6">{banner}</div> : null}

          <div className="mt-6 grid gap-6 xl:grid-cols-2 xl:gap-10">
            {/* Location + map (side panel on desktop) */}
            <div
              className="min-w-0 space-y-1.5"
              onKeyDown={(event) => {
                // Enter in the address search picks a suggestion; it must not submit the whole step.
                if (event.key === 'Enter' && (event.target as HTMLElement).id === LOCATION_INPUT_ID) event.preventDefault();
              }}
            >
              <label id={`${LOCATION_INPUT_ID}-label`} htmlFor={LOCATION_INPUT_ID} className="block text-label text-ink">
                {t('auth.signUp.currentLocationLabel')}
                <span aria-hidden="true" className="text-danger"> *</span>
              </label>
              <div ref={locationWrapRef} className={cn('rounded-control', fieldErrors.location && 'ring-2 ring-danger ring-offset-2 ring-offset-surface')}>
                <LocationPicker
                  value={{ lat: profileForm.latitude ?? 0, lng: profileForm.longitude ?? 0, address: profileForm.location }}
                  onChange={({ lat, lng, address }) => {
                    setProfileForm((prev) => ({ ...prev, location: address, latitude: lat, longitude: lng }));
                    setFieldErrors((prev) => (prev.location ? { ...prev, location: undefined } : prev));
                  }}
                  addressPlaceholder={t('post.labels.locationPlaceholder')}
                  detectLocationLabel={t('auth.signUp.detectLocation')}
                  height={MAP_HEIGHT}
                />
              </div>
              {fieldErrors.location ? (
                <p id={`${LOCATION_INPUT_ID}-error`} className="text-caption font-bold text-danger">
                  {fieldErrors.location}
                </p>
              ) : null}
            </div>

            <div className="min-w-0 space-y-5">
              <Textarea
                id="signup-bio"
                label={t('auth.signUp.bioLabel')}
                rows={4}
                value={profileForm.bio}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder={t('auth.signUp.bioPlaceholder')}
              />

              {workerFields ? (
                <section aria-labelledby="work-details-heading" className="space-y-5 border-t border-line pt-5">
                  <div>
                    <h2 id="work-details-heading" className="text-h3 text-ink">
                      {t('auth.signUp.workDetailsTitle')}
                    </h2>
                    <p className="mt-1 text-caption text-ink-muted">{t('auth.signUp.workDetailsBody')}</p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Input
                      id="signup-skill"
                      label={t('auth.signUp.primarySkillLabel')}
                      value={profileForm.primarySkill}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, primarySkill: e.target.value }))}
                      placeholder={t('auth.signUp.primarySkillPlaceholder')}
                    />
                    <Input
                      id="signup-radius"
                      label={t('auth.signUp.serviceRadiusLabel')}
                      inputMode="numeric"
                      value={profileForm.serviceRadiusKm}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, serviceRadiusKm: e.target.value }))}
                      placeholder="10"
                    />

                    {/* Rate + currency: side by side from 400px, stacked below (no fixed column). */}
                    <div className="grid grid-cols-1 items-end gap-3 min-[400px]:grid-cols-[minmax(0,1fr)_auto] md:col-span-2">
                      <Input
                        id="signup-rate"
                        label={t('auth.signUp.hourlyRateLabel')}
                        inputMode="decimal"
                        value={profileForm.hourlyRate}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, hourlyRate: e.target.value }))}
                        placeholder="45"
                        className="tabular-nums"
                      />
                      <div role="group" aria-labelledby="signup-currency-label" className="min-w-0 space-y-1.5">
                        <span id="signup-currency-label" className="block text-label text-ink">
                          {t('post.labels.currency')}
                        </span>
                        <div className="[&>div>button]:min-h-[48px] [&>div>button]:rounded-control [&>div>button]:border-line-strong [&>div>button]:bg-surface">
                          <CurrencySelector
                            value={profileForm.hourlyRateCurrency}
                            onChange={(currency) => setProfileForm((prev) => ({ ...prev, hourlyRateCurrency: currency }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
            <Button type="button" variant="secondary" onClick={goToPreviousStep} className="hidden md:inline-flex">
              {backLabel}
            </Button>
            <Button type="submit" size="lg" loading={loading} className="w-full md:w-auto md:min-w-[200px]">
              {loading ? null : <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden="true" />}
              {t('auth.signUp.finish')}
            </Button>
          </div>
        </form>
      </SignupShell>
    );
  }

  /* ---------------- Step 1: account ---------------- */
  return (
    <SignupShell step={1} backLabel={backLabel} onBack={() => router.back()} t={t}>
      <div className="mx-auto w-full max-w-[560px] xl:grid xl:max-w-content xl:grid-cols-12 xl:items-start xl:gap-12">
        <section aria-labelledby="signup-explainer-heading" className="hidden xl:col-span-5 xl:block xl:pt-10">
          <h2 id="signup-explainer-heading" className="font-display text-h1 text-ink">
            {t('auth.signUp.explainerTitle')}
          </h2>
          <p className="mt-3 text-body-lg text-ink-muted">{t('auth.signUp.explainerBody')}</p>
          <div className="mt-8">
            <StepList current={1} completedThrough={0} t={t} />
          </div>
        </section>

        <form method="post" noValidate onSubmit={submitWith(() => handleAccountCreation(false))} className={cn('xl:col-span-7', CARD)}>
          <StepHeader step={1} t={t} />
          <h1 className="text-h1 text-ink">{t('auth.signUp.title')}</h1>
          <p className="mt-2 text-body text-ink-muted">{t('auth.signUp.accountSubtitle')}</p>

          {banner ? <div className="mt-6">{banner}</div> : null}

          <div className="mt-6 space-y-5">
            <Input
              ref={fieldRefs.fullName}
              id="signup-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              label={t('auth.signUp.fullNameLabel')}
              placeholder={t('auth.signUp.fullNamePlaceholder')}
              value={accountForm.fullName}
              onChange={(e) => updateAccount('fullName', e.target.value)}
              error={fieldErrors.fullName}
            />
            <Input
              ref={fieldRefs.email}
              id="signup-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              label={t('auth.signUp.emailAddressLabel')}
              placeholder={t('auth.signUp.emailPlaceholder')}
              value={accountForm.email}
              onChange={(e) => updateAccount('email', e.target.value)}
              error={fieldErrors.email}
            />
            <Input
              ref={fieldRefs.phoneNumber}
              id="signup-phone"
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              label={t('profile.phoneNumber')}
              hint={t('auth.signUp.phoneHint')}
              placeholder={t('auth.signUp.phonePlaceholder')}
              value={accountForm.phoneNumber}
              onChange={(e) => updateAccount('phoneNumber', e.target.value)}
              error={fieldErrors.phoneNumber}
            />
            <PasswordField
              ref={fieldRefs.password}
              id="signup-password"
              name="new-password"
              autoComplete="new-password"
              required
              label={t('auth.signUp.password')}
              hint={t('auth.signUp.passwordHint')}
              showLabel={t('auth.password.show')}
              hideLabel={t('auth.password.hide')}
              value={accountForm.password}
              onChange={(e) => updateAccount('password', e.target.value)}
              error={fieldErrors.password}
            />
          </div>

          <Checkbox
            ref={fieldRefs.acceptedTerms}
            id="signup-terms"
            wrapperClassName="mt-4"
            checked={accountForm.acceptedTerms}
            onChange={(e) => updateAccount('acceptedTerms', e.target.checked)}
            error={fieldErrors.acceptedTerms}
            label={
              <span className="text-ink-muted">
                {t('auth.signUp.agreeToThePrefix')}{' '}
                <Link href="/terms" className="font-bold text-primary underline underline-offset-2">
                  {t('footer.terms')}
                </Link>{' '}
                {t('auth.signUp.and')}{' '}
                <Link href="/privacy" className="font-bold text-primary underline underline-offset-2">
                  {t('footer.privacy')}
                </Link>
                .
              </span>
            }
          />

          <div className="mt-6 space-y-5">
            <Button type="submit" size="lg" className="w-full" loading={loading} disabled={busy}>
              {loading ? t('auth.signUp.creating') : t('auth.signUp.createAccount')}
            </Button>
            <OrDivider label={t('auth.or')} />
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              loading={googleLoading}
              disabled={busy}
              onClick={() => void handleAccountCreation(true)}
            >
              {googleLoading ? null : <GoogleIcon />}
              {t('auth.signUp.continueWithGoogle')}
            </Button>
          </div>

          <p className="mt-8 text-center text-body text-ink-muted">
            {t('auth.signUp.haveAccount')}{' '}
            <Link href="/signin" className="inline-flex min-h-[44px] items-center font-bold text-primary underline-offset-4 hover:underline">
              {t('auth.signUp.signInLink')}
            </Link>
          </p>
        </form>
      </div>
    </SignupShell>
  );
}
