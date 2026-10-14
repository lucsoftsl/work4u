'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from "@/components/LocaleLink";
import { useRouter } from 'next/navigation';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { ActionCodeSettings, sendPasswordResetEmail } from 'firebase/auth';
import { signIn, signInWithGoogle } from '@/lib/auth-service';
import type { SignInData } from '@/types/auth';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { describeAuthError } from '@/lib/auth-errors';
import { clearRememberedRedirect, resolvePostAuthTarget, signUpPath } from '@/lib/auth-redirect';
import { postSignInPath } from '@/lib/signup-resume';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { cn } from '@/lib/utils';
import { useStripCredentialParams } from '@/lib/useStripCredentialParams';

/* ------------------------------------------------------------------ */
/* Shared auth pieces (also used by /signup)                           */
/* ------------------------------------------------------------------ */

/** Plain "work4u" wordmark (design §5.6). Links home. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        'inline-flex min-h-[44px] items-center font-display text-h3 font-bold tracking-tight text-primary',
        className
      )}
    >
      work4u
    </Link>
  );
}

/** Form-level error banner: danger-soft, 4px danger left border, icon (design §5.8). */
export function AuthErrorBanner({ message, id }: { message: string; id?: string }) {
  return (
    <div
      id={id}
      role="alert"
      className="flex items-start gap-3 rounded-control border-l-4 border-danger bg-danger-soft px-4 py-3 text-body text-ink"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
      <p className="min-w-0 break-words">{message}</p>
    </div>
  );
}

/** "Or" divider between the primary action and Google. */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <span className="text-micro uppercase text-ink-muted">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

const CONTROL =
  'w-full min-h-[48px] rounded-control border bg-surface py-2.5 pl-3 pr-20 text-body text-ink placeholder:text-ink-subtle transition-colors duration-fast ' +
  'hover:border-ink-muted focus:border-primary focus:outline-none focus:shadow-focus disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-subtle';

interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  showLabel: string;
  hideLabel: string;
  hint?: string;
  error?: string | null;
}

/** Password input with a "Show"/"Hide" text toggle (44px, aria-pressed) inside the box (design §5.5). */
export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, showLabel, hideLabel, hint, error, id, className, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const [visible, setVisible] = useState(false);
    const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="block text-label text-ink">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(CONTROL, error ? 'border-danger' : 'border-line-strong', className)}
            {...props}
          />
          <button
            type="button"
            aria-pressed={visible}
            aria-controls={fieldId}
            onClick={() => setVisible((prev) => !prev)}
            className="absolute right-0.5 top-1/2 inline-flex h-11 min-w-[44px] -translate-y-1/2 items-center justify-center rounded-control px-3 text-label text-ink-muted transition-colors duration-fast hover:bg-sunken hover:text-ink"
          >
            {visible ? hideLabel : showLabel}
          </button>
        </div>
        {hint && !error ? (
          <p id={`${fieldId}-hint`} className="text-caption text-ink-muted">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={`${fieldId}-error`} className="flex items-start gap-1.5 text-caption font-bold text-danger">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
PasswordField.displayName = 'PasswordField';

/* ------------------------------------------------------------------ */
/* Sign in                                                            */
/* ------------------------------------------------------------------ */

interface SignInError {
  field?: 'email' | 'password';
  message: string;
}

const DEFAULT_AFTER_SIGN_IN = '/dashboard';

/** Read once, when the page opens: later navigation changes the URL (and drops `?redirect=`), but the target must not change. */
function initialTarget(): string {
  if (typeof window === 'undefined') return DEFAULT_AFTER_SIGN_IN;
  return resolvePostAuthTarget(window.location.search) ?? DEFAULT_AFTER_SIGN_IN;
}

export default function SignInComponent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  useStripCredentialParams();
  const targetRef = useRef<string | null>(null);
  const afterSignInPath = () => (targetRef.current ??= initialTarget());

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<SignInError | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<SignInData>({ email: '', password: '' });

  const busy = loading || googleLoading;

  const showError = (next: SignInError) => {
    setError(next);
    if (next.field === 'email') emailRef.current?.focus();
    if (next.field === 'password') passwordRef.current?.focus();
  };

  const resolveSignInError = (value: unknown) => {
    if (value instanceof FirebaseError) return value;
    return new Error(
      typeof value === 'object' && value && 'message' in value
        ? String((value as { message: unknown }).message)
        : t('auth.signIn.error.generic')
    );
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.email) {
      showError({ field: 'email', message: t('auth.signIn.error.emailRequired') });
      return false;
    }
    if (!formData.password) {
      showError({ field: 'password', message: t('auth.signIn.error.passwordRequired') });
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResetMessage(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      const signedIn = await signIn(formData);
      const next = postSignInPath(signedIn, afterSignInPath());
      if (next === afterSignInPath()) clearRememberedRedirect();
      router.push(next);
    } catch (err: unknown) {
      const info = describeAuthError(resolveSignInError(err));
      showError({ field: info.field, message: t(info.key) });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const signedIn = await signInWithGoogle();
      const next = postSignInPath(signedIn, afterSignInPath());
      if (next === afterSignInPath()) clearRememberedRedirect();
      router.push(next);
    } catch (err: unknown) {
      const resolvedError = resolveSignInError(err);

      if (resolvedError.message === 'USER_NOT_FOUND') {
        showError({ message: t('auth.signIn.noAccountFound') });
      } else if (!(resolvedError instanceof FirebaseError && resolvedError.code === 'auth/popup-closed-by-user')) {
        showError({ message: t(describeAuthError(resolvedError).key) });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setResetMessage(null);
    setError(null);

    if (!formData.email) {
      showError({ field: 'email', message: t('auth.signIn.error.emailRequired') });
      return;
    }

    setResetLoading(true);
    try {
      const actionCodeSettings: ActionCodeSettings = {
        url: `${window.location.origin}/signin`,
        handleCodeInApp: false,
      };
      await sendPasswordResetEmail(auth, formData.email, actionCodeSettings);
      setResetMessage(t('auth.resetPassword.sent'));
    } catch {
      // Same message either way so the form never reveals whether an account exists.
      setResetMessage(t('auth.resetPassword.sent'));
    } finally {
      setResetLoading(false);
    }
  };

  // Capture the target the moment the page opens, before any navigation rewrites the URL.
  useEffect(() => {
    afterSignInPath();
  }, []);

  // Already signed in (or just became so): continue to the remembered target, through onboarding if it is unfinished.
  useEffect(() => {
    if (!isAuthenticated) return;
    const target = targetRef.current ?? initialTarget();
    targetRef.current = target;
    router.replace(postSignInPath(user, target));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `user` only refines the destination; navigate once per sign-in
  }, [isAuthenticated, router]);

  const bannerError = error && !error.field ? error.message : null;

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-12">
      {/* Form column (7) */}
      <div className="flex min-h-dvh flex-col lg:col-span-7 lg:bg-surface">
        <div className="flex h-14 items-center border-b border-line bg-surface px-[var(--gutter)] md:h-16 md:border-b-0 md:bg-transparent lg:px-10">
          <Wordmark />
        </div>

        <div className="flex flex-1 items-start justify-center px-[var(--gutter)] py-8 md:items-center md:py-12">
          <div className="w-full max-w-[480px] md:rounded-card md:border md:border-line md:bg-surface md:p-8 md:shadow-stamp lg:max-w-[440px] lg:border-0 lg:p-0 lg:shadow-none">
            <h1 className="text-h1 text-ink">{t('auth.signIn.welcomeBack')}</h1>
            <p className="mt-2 text-body text-ink-muted">{t('auth.signIn.manageSubtitle')}</p>

            <form method="post" className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
              {bannerError ? <AuthErrorBanner message={bannerError} /> : null}

              <Input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                label={t('auth.signIn.email')}
                placeholder={t('auth.signUp.emailPlaceholder')}
                value={formData.email}
                onChange={handleInputChange}
                error={error?.field === 'email' ? error.message : null}
              />

              <div>
                <PasswordField
                  ref={passwordRef}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  label={t('auth.signIn.password')}
                  showLabel={t('auth.password.show')}
                  hideLabel={t('auth.password.hide')}
                  value={formData.password}
                  onChange={handleInputChange}
                  error={error?.field === 'password' ? error.message : null}
                />
                <div className="mt-1 flex flex-wrap items-center justify-end gap-x-2 text-caption text-ink-muted">
                  <span>{t('auth.signIn.forgotPassword')}</span>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resetLoading}
                    aria-busy={resetLoading || undefined}
                    className="inline-flex min-h-[44px] items-center rounded-control px-1 text-label text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {resetLoading ? t('auth.resetPassword.sending') : t('auth.signIn.sendResetLink')}
                  </button>
                </div>
                <div role="status" aria-live="polite">
                  {resetMessage ? (
                    <p className="flex items-start gap-2 rounded-control bg-success-soft px-3 py-2 text-caption text-success">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {resetMessage}
                    </p>
                  ) : null}
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" loading={loading} disabled={busy}>
                {loading ? t('auth.signIn.signing') : t('auth.signIn.signIn')}
                {loading ? null : <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />}
              </Button>

              <OrDivider label={t('auth.or')} />

              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={handleGoogleSignIn}
                loading={googleLoading}
                disabled={busy}
              >
                {googleLoading ? null : <GoogleIcon />}
                {t('auth.signUp.continueWithGoogle')}
              </Button>
            </form>

            <p className="mt-8 text-center text-body text-ink-muted">
              {t('auth.signIn.newHere')}{' '}
              <Link
                href="/signup"
                onClick={(event) => {
                  const target = afterSignInPath();
                  if (target === DEFAULT_AFTER_SIGN_IN) return;
                  event.preventDefault();
                  router.push(signUpPath(target)); // keep where the person was going
                }}
                className="inline-flex min-h-[44px] items-center rounded-control font-bold text-primary underline-offset-4 hover:underline"
              >
                {t('auth.signIn.joinLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Brand panel (5), desktop only */}
      <section
        aria-labelledby="signin-brand-heading"
        className="relative hidden overflow-hidden bg-primary text-on-fill lg:col-span-5 lg:flex lg:flex-col lg:justify-center lg:p-12 xl:p-16"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(rgb(255_255_255)_1px,transparent_1px)] [background-size:20px_20px]"
        />
        <div className="relative max-w-md">
          <p className="inline-flex rounded-control bg-primary-strong px-3 py-1.5 text-micro uppercase">
            {t('auth.signIn.panelEyebrow')}
          </p>
          <h2 id="signin-brand-heading" className="mt-5 font-display text-display text-on-fill">
            {t('auth.signIn.panelTitle')}
          </h2>
          <p className="mt-5 text-body-lg text-on-fill/85">{t('auth.signIn.panelBody')}</p>

          <ul className="mt-10 space-y-4 border-t border-on-fill/20 pt-8">
            {[
              [t('auth.signIn.feature1Title'), t('auth.signIn.feature1Desc')],
              [t('auth.signIn.feature2Title'), t('auth.signIn.feature2Desc')],
              [t('auth.signIn.feature3Title'), t('auth.signIn.feature3Desc')],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-soft" aria-hidden="true" />
                <div>
                  <p className="text-label text-on-fill">{title}</p>
                  <p className="text-caption text-on-fill/85">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
