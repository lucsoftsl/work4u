'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, signInWithGoogle } from '@/lib/auth-service';
import type { SignInData } from '@/types/auth';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface SignInError {
  field?: string;
  message: string;
}

const passwordMeetsPolicy = (pwd: string) => /(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}/.test(pwd);

export default function SignInComponent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SignInError | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<SignInData>({
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

    if (!passwordMeetsPolicy(formData.password)) {
      setError({ field: 'password', message: t('auth.signIn.error.passwordComplexity') });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const user = await signIn(formData);
      console.log('✅ Sign in successful:', user);

      // Redirect to home page
      router.push('/');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('❌ Sign in failed:', err);

      const errorMessage = err.message || t('auth.signIn.error.generic');

      // Firebase specific error handling
      if (err.code === 'auth/user-not-found') {
        setError({ field: 'email', message: t('auth.signIn.error.userNotFound') });
      } else if (err.code === 'auth/wrong-password') {
        setError({ field: 'password', message: t('auth.signIn.error.wrongPassword') });
      } else if (err.code === 'auth/invalid-email') {
        setError({ field: 'email', message: t('auth.signIn.error.invalidEmail') });
      } else if (err.code === 'auth/user-disabled') {
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
      const user = await signInWithGoogle();
      console.log('✅ Google sign in successful:', user);
      router.push('/');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('❌ Google sign in failed:', err);

      if (err.message === 'USER_NOT_FOUND') {
        // User authenticated with Google but doesn't have an account
        setError({ message: 'No account found. Please sign up first.' });
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, just clear loading state
        setLoading(false);
        return;
      } else {
        setError({ message: err.message || t('auth.signIn.error.generic') });
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
      const actionCodeSettings = {
        url: typeof window !== 'undefined' ? `${window.location.origin}/signin` : undefined,
        handleCodeInApp: false,
      } as any;
      await sendPasswordResetEmail(auth, formData.email, actionCodeSettings);
      setResetMessage(t('auth.resetPassword.sent'));
    } catch (err) {
      console.warn('Password reset email error:', err);
      // Do not reveal whether the user exists; show generic success-like message
      setResetMessage(t('auth.resetPassword.sent'));
    } finally {
      setResetLoading(false);
    }
  };

  // Redirect to home if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Content */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t('auth.signIn.title')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('auth.signIn.subtitle')}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && !error.field && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm font-medium text-red-800">{error.message}</div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.signIn.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.email}
                onChange={handleInputChange}
              />
              {error?.field === 'email' && (
                <p className="mt-1 text-sm text-red-600">{error.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.signIn.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.password}
                onChange={handleInputChange}
              />
              {error?.field === 'password' && (
                <p className="mt-1 text-sm text-red-600">{error.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('auth.signIn.signing') : t('auth.signIn.signIn')}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">{t('auth.signIn.orDivider')}</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t('auth.signIn.googleButton')}
            </button>

            {/* Forgot Password */}
            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resetLoading}
                className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? t('auth.resetPassword.sending') : t('auth.signIn.forgotPassword')}
              </button>
              {resetMessage && (
                <p className="text-xs text-gray-600">{resetMessage}</p>
              )}
            </div>
          </form>

          <p className="text-center text-sm text-gray-600">
            {t('auth.signIn.noAccount')}{' '}
            <a href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              {t('auth.signIn.signUpLink')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
