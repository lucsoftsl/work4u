'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp, signUpWithGoogle } from '@/lib/auth-service';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { SignUpData } from '@/types/auth';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';

interface SignUpError {
  field?: string;
  message: string;
}

const passwordMeetsPolicy = (pwd: string) => /(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{4,}/.test(pwd);

export default function SignUpComponent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SignUpError | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleUserType, setGoogleUserType] = useState<'PERSONAL' | 'ENTERPRISE'>('PERSONAL');
  const [googleWorkerTypes, setGoogleWorkerTypes] = useState<Array<'WORKER' | 'REQUESTOR'>>([]);

  const [formData, setFormData] = useState<SignUpData>({
    email: '',
    password: '',
    displayName: '',
    userType: 'PERSONAL',
    workerTypes: [],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleWorkerTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target as HTMLInputElement & { value: 'WORKER' | 'REQUESTOR' };

    setFormData((prev) => ({
      ...prev,
      workerTypes: checked
        ? [...prev.workerTypes, value]
        : prev.workerTypes.filter((type) => type !== value),
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.email) {
      setError({ field: 'email', message: t('auth.signUp.error.emailRequired') });
      return false;
    }

    if (!formData.email.includes('@')) {
      setError({ field: 'email', message: t('auth.signUp.error.invalidEmail') });
      return false;
    }

    if (!formData.password) {
      setError({ field: 'password', message: t('auth.signUp.error.passwordRequired') });
      return false;
    }

    if (!passwordMeetsPolicy(formData.password)) {
      setError({ field: 'password', message: t('auth.signUp.error.passwordLength') });
      return false;
    }

    if (!formData.displayName) {
      setError({ field: 'displayName', message: t('auth.signUp.error.displayNameRequired') });
      return false;
    }

    if (formData.workerTypes.length === 0) {
      setError({ message: t('auth.signUp.error.workerTypeRequired') });
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
      const user = await signUp(formData);
      console.log('✅ User created successfully:', user);

      // Wait for Firebase auth state to be updated before redirecting
      // This ensures the AuthContext has populated the user data
      await new Promise<void>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            unsubscribe();
            resolve();
          }
        });
      });

      // Give a brief moment for the auth context to fully settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Redirect to home page
      router.push('/');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('❌ Sign up failed:', err);

      const errorMessage = err.message || 'Failed to create account';

      // Firebase specific error handling
      if (err.code === 'auth/email-already-in-use') {
        setError({ field: 'email', message: t('auth.signUp.error.emailInUse') });
      } else if (err.code === 'auth/weak-password') {
        setError({ field: 'password', message: t('auth.signUp.error.weakPassword') });
      } else if (err.code === 'auth/invalid-email') {
        setError({ field: 'email', message: t('auth.signUp.error.invalidEmail') });
      } else {
        setError({ message: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    setError(null);
    setShowGoogleModal(true);
  };

  const handleGoogleWorkerTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target as HTMLInputElement & { value: 'WORKER' | 'REQUESTOR' };
    setGoogleWorkerTypes(
      checked
        ? [...googleWorkerTypes, value]
        : googleWorkerTypes.filter((type) => type !== value)
    );
  };

  const completeGoogleSignUp = async () => {
    if (googleWorkerTypes.length === 0) {
      setError({ message: t('auth.signUp.error.workerTypeRequired') });
      return;
    }

    setLoading(true);

    try {
      const user = await signUpWithGoogle(googleUserType, googleWorkerTypes);
      console.log('✅ Google sign up successful:', user);

      // Wait for Firebase auth state to be updated before redirecting
      await new Promise<void>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            unsubscribe();
            resolve();
          }
        });
      });

      // Give a brief moment for the auth context to fully settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      setShowGoogleModal(false);
      router.push('/');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('❌ Google sign up failed:', err);

      if (err.code === 'auth/popup-closed-by-user') {
        setLoading(false);
        setShowGoogleModal(false);
        return;
      }

      setError({ message: err.message || t('auth.signUp.error.generic') });
    } finally {
      setLoading(false);
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
              {t('auth.signUp.title')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('auth.signUp.subtitle')}
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
                {t('auth.signUp.email')}
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
                {t('auth.signUp.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.password}
                onChange={handleInputChange}
              />
              {error?.field === 'password' && (
                <p className="mt-1 text-sm text-red-600">{error.message}</p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                {t('auth.signUp.displayName')}
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.displayName}
                onChange={handleInputChange}
              />
              {error?.field === 'displayName' && (
                <p className="mt-1 text-sm text-red-600">{error.message}</p>
              )}
            </div>

            {/* User Type */}
            <div>
              <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
                {t('auth.signUp.accountType')}
              </label>
              <select
                id="userType"
                name="userType"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.userType}
                onChange={handleInputChange}
              >
                <option value="PERSONAL">{t('auth.signUp.personal')}</option>
                <option value="ENTERPRISE">{t('auth.signUp.enterprise')}</option>
              </select>
            </div>

            {/* Worker Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.signUp.whatToDo')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="workerType"
                    value="WORKER"
                    checked={formData.workerTypes.includes('WORKER')}
                    onChange={handleWorkerTypeChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {t('auth.signUp.offerServices')}
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="workerType"
                    value="REQUESTOR"
                    checked={formData.workerTypes.includes('REQUESTOR')}
                    onChange={handleWorkerTypeChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {t('auth.signUp.postTasks')}
                  </span>
                </label>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('auth.signUp.creating') : t('auth.signUp.createAccount')}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">{t('auth.signUp.orDivider')}</span>
              </div>
            </div>

            {/* Google Sign-Up Button */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t('auth.signUp.googleButton')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            {t('auth.signUp.haveAccount')}{' '}
            <a href="/signin" className="font-medium text-blue-600 hover:text-blue-500">
              {t('auth.signUp.signInLink')}
            </a>
          </p>
        </div>
      </div>

      {/* Google Sign-Up Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => !loading && setShowGoogleModal(false)} />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  {t('auth.signUp.title')}
                </h3>

                {error && !error.field && (
                  <div className="rounded-md bg-red-50 p-4 mb-4">
                    <div className="text-sm font-medium text-red-800">{error.message}</div>
                  </div>
                )}

                {/* Account Type */}
                <div className="mb-4">
                  <label htmlFor="googleUserType" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('auth.signUp.accountType')}
                  </label>
                  <select
                    id="googleUserType"
                    name="googleUserType"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={googleUserType}
                    onChange={(e) => setGoogleUserType(e.target.value as 'PERSONAL' | 'ENTERPRISE')}
                  >
                    <option value="PERSONAL">{t('auth.signUp.personal')}</option>
                    <option value="ENTERPRISE">{t('auth.signUp.enterprise')}</option>
                  </select>
                </div>

                {/* Worker Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.signUp.whatToDo')}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="googleWorkerType"
                        value="WORKER"
                        checked={googleWorkerTypes.includes('WORKER')}
                        onChange={handleGoogleWorkerTypeChange}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {t('auth.signUp.offerServices')}
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="googleWorkerType"
                        value="REQUESTOR"
                        checked={googleWorkerTypes.includes('REQUESTOR')}
                        onChange={handleGoogleWorkerTypeChange}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {t('auth.signUp.postTasks')}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={completeGoogleSignUp}
                  disabled={loading || googleWorkerTypes.length === 0}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('auth.signUp.creating') : t('auth.signUp.createAccount')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  disabled={loading}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
