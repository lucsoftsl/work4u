'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { ActionCodeSettings, sendPasswordResetEmail } from 'firebase/auth';
import { signIn, signInWithGoogle } from '@/lib/auth-service';
import type { SignInData } from '@/types/auth';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';

interface SignInError {
  field?: string;
  message: string;
}

export default function SignInComponent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<SignInError | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<SignInData>({
    email: '',
    password: '',
  });

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
      setError({ field: 'email', message: t('auth.signIn.error.emailRequired') });
      return false;
    }

    if (!formData.password) {
      setError({ field: 'password', message: t('auth.signIn.error.passwordRequired') });
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      await signIn(formData);
      router.push('/dashboard');
    } catch (err: unknown) {
      const resolvedError = resolveSignInError(err);
      const errorMessage = resolvedError.message || t('auth.signIn.error.generic');

      if (resolvedError instanceof FirebaseError && resolvedError.code === 'auth/user-not-found') {
        setError({ field: 'email', message: t('auth.signIn.error.userNotFound') });
      } else if (resolvedError instanceof FirebaseError && resolvedError.code === 'auth/wrong-password') {
        setError({ field: 'password', message: t('auth.signIn.error.wrongPassword') });
      } else if (resolvedError instanceof FirebaseError && resolvedError.code === 'auth/invalid-email') {
        setError({ field: 'email', message: t('auth.signIn.error.invalidEmail') });
      } else if (resolvedError instanceof FirebaseError && resolvedError.code === 'auth/user-disabled') {
        setError({ message: t('auth.signIn.error.userDisabled') });
      } else {
        setError({ message: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (err: unknown) {
      const resolvedError = resolveSignInError(err);

      if (resolvedError.message === 'USER_NOT_FOUND') {
        setError({ message: 'No account found. Please sign up first.' });
      } else if (!(resolvedError instanceof FirebaseError && resolvedError.code === 'auth/popup-closed-by-user')) {
        setError({ message: resolvedError.message || t('auth.signIn.error.generic') });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setResetMessage(null);
    setError(null);

    if (!formData.email) {
      setError({ field: 'email', message: t('auth.signIn.error.emailRequired') });
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
      setResetMessage(t('auth.resetPassword.sent'));
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-[#edf2f7]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
        <aside className="hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(219,233,240,0.9)_35%,_rgba(193,214,226,0.95)_100%)] p-12 lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="inline-flex items-center gap-3 text-[#11324a]">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e6d8a] text-white shadow-[0_14px_28px_rgba(30,109,138,0.22)]">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-3xl font-black tracking-tight">Work4U</span>
              <span className="block text-xs font-bold uppercase tracking-[0.24em] text-[#6b7f96]">Trusted local work</span>
            </span>
          </Link>

          <div className="mx-auto max-w-xl">
            <span className="inline-flex rounded-full bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#1e6d8a]">
              Return to your workspace
            </span>
            <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-tight text-[#10243a]">
              Pick up where you left off and keep work moving.
            </h1>
            <p className="mt-6 text-lg leading-8 text-[#556a84]">
              Review new applicants, manage active jobs, and stay close to the opportunities that matter most.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Secure sign-in', 'Protected sessions with your Work4U account.'],
              ['Faster follow-up', 'Jump straight back into your dashboard and jobs.'],
              ['Clear next steps', 'Keep onboarding and profile actions in one place.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-soft backdrop-blur">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#1e6d8a]">{title}</p>
                <p className="mt-3 text-sm leading-6 text-[#5e728b]">{body}</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-xl rounded-[2rem] border border-[#d8e3ea] bg-white p-6 shadow-soft sm:p-8 lg:p-10">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full bg-[#e8f3f7] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#1e6d8a]">
                  Sign in
                </span>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-[#10243a]">{t('auth.signIn.title')}</h2>
                <p className="mt-3 text-sm leading-6 text-[#60758f]">{t('auth.signIn.subtitle')}</p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && !error.field ? (
                <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error.message}
                </div>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#18324b]">{t('auth.signIn.email')}</span>
                <div className="relative rounded-2xl border border-[#d7e2ea] bg-[#fbfdfe]">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8aa0b7]" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="h-14 w-full rounded-2xl border-0 bg-transparent pl-12 pr-4 text-sm text-[#10243a] outline-none placeholder:text-[#8aa0b7]"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                {error?.field === 'email' ? <p className="mt-2 text-sm text-red-600">{error.message}</p> : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#18324b]">{t('auth.signIn.password')}</span>
                <div className="relative rounded-2xl border border-[#d7e2ea] bg-[#fbfdfe]">
                  <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8aa0b7]" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="h-14 w-full rounded-2xl border-0 bg-transparent pl-12 pr-12 text-sm text-[#10243a] outline-none placeholder:text-[#8aa0b7]"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8aa0b7]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {error?.field === 'password' ? <p className="mt-2 text-sm text-red-600">{error.message}</p> : null}
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1e6d8a] px-5 py-4 text-sm font-bold text-white shadow-[0_16px_32px_rgba(30,109,138,0.22)] transition hover:bg-[#195f78]"
              >
                {loading ? t('auth.signIn.signing') : t('auth.signIn.signIn')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e2e9ee]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs font-bold uppercase tracking-[0.18em] text-[#8aa0b7]">
                    {t('auth.signIn.orDivider')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d7e2ea] bg-white px-5 py-4 text-sm font-semibold text-[#19334b] transition hover:bg-[#f8fbfd]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.signIn.googleButton')}
              </button>

              <div className="rounded-[1.5rem] bg-[#f5f8fb] px-4 py-4 text-sm text-[#5f738c]">
                <div className="flex items-center justify-between gap-3">
                  <span>{t('auth.signIn.forgotPassword')}</span>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resetLoading}
                    className="font-bold text-[#1e6d8a] disabled:opacity-60"
                  >
                    {resetLoading ? t('auth.resetPassword.sending') : 'Send reset link'}
                  </button>
                </div>
                {resetMessage ? <p className="mt-2 text-xs text-[#7187a0]">{resetMessage}</p> : null}
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-[#60758f]">
              {t('auth.signIn.noAccount')}{' '}
              <Link href="/signup" className="font-bold text-[#1e6d8a]">
                {t('auth.signIn.signUpLink')}
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
