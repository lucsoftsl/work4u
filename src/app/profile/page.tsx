"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile as updateProfile, getIdToken } from '@/lib/auth-service';
import countriesData from '@/data/countries.json';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Country = typeof countriesData[number];
const countries = countriesData as Country[];

const countryFlag = (code?: string) => {
  if (!code) return '';
  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
};

const parseAddress = (addr?: string | null) => {
  if (!addr) {
    return { country: '', state: '', address: '', city: '', postcode: '', number: '' };
  }
  try {
    const parsed = JSON.parse(addr);
    return {
      country: parsed.country ?? '',
      state: parsed.state ?? '',
      address: parsed.address ?? '',
      city: parsed.city ?? '',
      postcode: parsed.postcode ?? '',
      number: parsed.number ?? '',
    };
  } catch {
    return { country: '', state: '', address: '', city: '', postcode: '', number: '' };
  }
};

export default function ProfilePage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const router = useRouter();
  const { signOut } = useAuth();
  const user = useSelector((state: RootState) => state.auth.user);

  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countryQuery, setCountryQuery] = useState('');
  const [stateQuery, setStateQuery] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  const parsedUserAddress = user ? parseAddress(user.address) : { country: '', state: '', address: '', city: '', postcode: '', number: '' };

  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    phoneNumber: user?.phoneNumber || '',
    userType: user?.userType || 'PERSONAL',
    workerTypes: user?.workerTypes || [],
    country: parsedUserAddress.country || user?.country || '',
    state: parsedUserAddress.state || user?.state || '',
    address: parsedUserAddress.address ?? '',
    city: parsedUserAddress.city || '',
    postcode: parsedUserAddress.postcode || user?.postcode || '',
    number: parsedUserAddress.number || user?.number || '',
  });

  const selectedCountry = useMemo(() => countries.find((c) => c.code2 === formData.country), [formData.country]);
  const filteredCountries = useMemo(() => {
    const term = countryQuery.trim().toLowerCase();
    return countries.filter((c) =>
      c.name.toLowerCase().includes(term) || c.code2.toLowerCase().includes(term)
    );
  }, [countryQuery]);

  const filteredStates = useMemo(() => {
    const states = selectedCountry?.states || [];
    const term = stateQuery.trim().toLowerCase();
    return states.filter((s) => s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term));
  }, [selectedCountry, stateQuery]);

  // Avoid hydration mismatch by waiting for client mount
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (formData.state && selectedCountry && !selectedCountry.states.find((s) => s.code === formData.state)) {
      setFormData((prev) => ({ ...prev, state: '' }));
    }
  }, [selectedCountry, formData.state]);

  // Show nothing during SSR to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('profile.signInRequiredTitle')}</h1>
          <p className="text-gray-600 mb-8">{t('profile.signInRequiredDesc')}</p>
          <div className="flex gap-4 justify-center">
            <Link href="/signin"><Button>{t('nav.signIn')}</Button></Link>
            <Link href="/signup"><Button variant="outline">{t('nav.getStarted')}</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    const parsed = parseAddress(user.address);
    setFormData({
      displayName: user.displayName || '',
      phoneNumber: user.phoneNumber || '',
      userType: user.userType || 'PERSONAL',
      workerTypes: user.workerTypes || [],
      country: parsed.country || user.country || '',
      state: parsed.state || user.state || '',
      address: parsed.address ?? '',
      city: parsed.city || '',
      postcode: parsed.postcode || user.postcode || '',
      number: parsed.number || user.number || '',
    });
    setIsEditing(true);
    setError(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/signin');
    } catch (err) {
      console.error('Sign out failed:', err);
      setError((err as Error).message || t('nav.signOut'));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const parsedViewAddress = user ? parseAddress(user.address) : { country: '', state: '', address: '', city: '', postcode: '', number: '' };
  const viewCountry = user ? countries.find((c) => c.code2 === (parsedViewAddress.country || user.country)) : undefined;
  const viewState = viewCountry?.states.find((s) => s.code === (parsedViewAddress.state || user.state));

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Update profile fields including workerTypes in one PATCH
      const addressPayload = JSON.stringify({
        country: formData.country || '',
        state: formData.state || '',
        address: formData.address || '',
        city: formData.city || '',
        postcode: formData.postcode || '',
        number: formData.number || '',
      });

      const updated = await updateProfile(user.id, {
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        userType: formData.userType,
        workerTypes: formData.workerTypes,
        address: addressPayload,
      });

      // Normalize workerTypes from API (array or CSV string)
      const normalizedWorkerTypes = Array.isArray(updated.workerTypes)
        ? (updated.workerTypes as string[])
        : typeof updated.workerTypes === 'string'
          ? (updated.workerTypes as string).split(',').map((s) => s.trim()).filter(Boolean)
          : formData.workerTypes;

      const parsedAddressUpdated = parseAddress(updated.address as string | null);
      const normalizedAddressString = updated.address ?? addressPayload;

      // Update Redux state with new user data
      dispatch(setUser({
        ...user,
        displayName: updated.displayName ?? null,
        phoneNumber: updated.phoneNumber ?? null,
        userType: updated.userType as 'PERSONAL' | 'ENTERPRISE',
        workerTypes: normalizedWorkerTypes as ('WORKER' | 'REQUESTOR')[],
        country: parsedAddressUpdated.country || null,
        state: parsedAddressUpdated.state || null,
        address: normalizedAddressString || null,
        city: parsedAddressUpdated.city || null,
        postcode: parsedAddressUpdated.postcode || null,
        number: parsedAddressUpdated.number || null,
      }));

      setIsEditing(false);
    } catch (err: unknown) {
      console.error('Failed to update profile:', err);
      setError((err as Error).message || t('profile.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const token = await getIdToken();
      const response = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Sign out and redirect
      await signOut();
      router.push('/');
    } catch (err: unknown) {
      console.error('Failed to delete account:', err);
      setError((err as Error).message || t('profile.deleteError'));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('profile.title')}</h1>
          <p className="text-gray-600">{t('profile.subtitle')}</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

          {/* Avatar & Basic Info */}
          <div className="px-8 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 mb-6">
              <div className="flex items-end gap-4">
                {user.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoUrl}
                    alt={user.displayName || user.email || 'User'}
                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="pb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{user.displayName || user.email}</h2>
                  <p className="text-gray-600">{user.email}</p>
                </div>
              </div>

              {!isEditing && (
                <div className="flex gap-2 mt-4 sm:mt-0">
                  <Button onClick={handleEdit} variant="outline">
                    {t('profile.editButton')}
                  </Button>
                  <Button onClick={handleSignOut} variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                    {t('nav.signOut') || 'Log out'}
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Profile Details */}
            {!isEditing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">{t('profile.displayName')}</label>
                    <p className="text-lg text-gray-900">{user.displayName || '-'}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">{t('profile.phoneNumber')}</label>
                    <p className="text-lg text-gray-900">{user.phoneNumber || '-'}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">{t('profile.accountType')}</label>
                    <p className="text-lg text-gray-900">{user.userType}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">{t('profile.workerTypes')}</label>
                    <p className="text-lg text-gray-900">
                      {Array.isArray(user.workerTypes) && user.workerTypes.length > 0
                        ? user.workerTypes.join(', ')
                        : '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">{t('profile.country')}</label>
                    <p className="text-lg text-gray-900 flex items-center gap-2">
                      {parsedViewAddress.country ? (
                        <>
                          <span>{countryFlag(parsedViewAddress.country)}</span>
                          <span>{viewCountry?.name || parsedViewAddress.country}</span>
                        </>
                      ) : '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">{t('profile.state')}</label>
                    <p className="text-lg text-gray-900">{viewState?.name || parsedViewAddress.state || '-'}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">{t('profile.address')}</label>
                    <p className="text-lg text-gray-900">{parsedViewAddress.address || '-'}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">{t('profile.city')}</label>
                    <p className="text-lg text-gray-900">{parsedViewAddress.city || '-'}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">{t('profile.number')}</label>
                    <p className="text-lg text-gray-900">{parsedViewAddress.number || '-'}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">{t('profile.postcode')}</label>
                    <p className="text-lg text-gray-900">{parsedViewAddress.postcode || '-'}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">{t('profile.status')}</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      user.status === 'PENDING_VERIFICATION' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {user.status}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.quickActions')}</h3>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/jobs">
                      <Button variant="outline">{t('jobs.title')}</Button>
                    </Link>
                    <Link href="/post-job">
                      <Button variant="outline">{t('nav.postJob')}</Button>
                    </Link>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-red-600 mb-2">{t('profile.dangerZone')}</h3>
                  <p className="text-sm text-gray-600 mb-4">{t('profile.deleteAccountWarning')}</p>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {t('profile.deleteAccount')}
                  </Button>
                </div>
              </div>
            ) : (
              // Edit Form
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.displayName')}
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.phoneNumber')}
                    </label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.accountType')}
                    </label>
                    <select
                      id="userType"
                      value={formData.userType}
                      onChange={(e) => setFormData({ ...formData, userType: e.target.value as 'PERSONAL' | 'ENTERPRISE' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="PERSONAL">{t('auth.signUp.personal')}</option>
                      <option value="ENTERPRISE">{t('auth.signUp.enterprise')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.signUp.whatToDo')}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        value="WORKER"
                        checked={formData.workerTypes.includes('WORKER')}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData({
                            ...formData,
                            workerTypes: checked
                              ? [...formData.workerTypes, 'WORKER']
                              : formData.workerTypes.filter(t => t !== 'WORKER')
                          });
                        }}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {t('auth.signUp.offerServices')}
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        value="REQUESTOR"
                        checked={formData.workerTypes.includes('REQUESTOR')}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData({
                            ...formData,
                            workerTypes: checked
                              ? [...formData.workerTypes, 'REQUESTOR']
                              : formData.workerTypes.filter(t => t !== 'REQUESTOR')
                          });
                        }}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {t('auth.signUp.postTasks')}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.country')}
                    </label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown((v) => !v)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg flex items-center justify-between hover:border-blue-500"
                      >
                        <span className="flex items-center gap-2 text-gray-700">
                          <span className="text-lg">{countryFlag(formData.country)}</span>
                          <span>{selectedCountry?.name || t('profile.country')}</span>
                        </span>
                        <span className="text-gray-500">▾</span>
                      </button>

                      {showCountryDropdown && (
                        <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
                          <div className="p-2 border-b border-gray-200">
                            <input
                              type="text"
                              value={countryQuery || selectedCountry?.name || ''}
                              onChange={(e) => setCountryQuery(e.target.value)}
                              placeholder={selectedCountry?.name || t('profile.searchCountry')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto divide-y">
                            {filteredCountries.slice(0, 50).map((country) => (
                              <button
                                key={country.code2}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, country: country.code2, state: '' });
                                  setCountryQuery('');
                                  setStateQuery('');
                                  setShowCountryDropdown(false);
                                  setShowStateDropdown(false);
                                }}
                                className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-blue-50 ${formData.country === country.code2 ? 'bg-blue-50' : ''}`}
                              >
                                <span>{countryFlag(country.code2)}</span>
                                <span className="flex-1">{country.name}</span>
                                <span className="text-xs text-gray-500">{country.code2}</span>
                              </button>
                            ))}
                            {filteredCountries.length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500">{t('profile.noResults')}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.state')}
                    </label>
                    {selectedCountry ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowStateDropdown((v) => !v)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg flex items-center justify-between hover:border-blue-500"
                        >
                          <span className="text-gray-700">{selectedCountry.states.find((s) => s.code === formData.state)?.name || t('profile.state')}</span>
                          <span className="text-gray-500">▾</span>
                        </button>

                        {showStateDropdown && (
                          <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
                            <div className="p-2 border-b border-gray-200 text-sm text-gray-700">
                              {selectedCountry.name}
                            </div>
                            <div className="p-2 border-b border-gray-200">
                              <input
                                type="text"
                                value={stateQuery || (selectedCountry.states.find((s) => s.code === formData.state)?.name ?? '')}
                                onChange={(e) => setStateQuery(e.target.value)}
                                placeholder={t('profile.searchState')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto divide-y">
                              {(filteredStates || []).slice(0, 80).map((state) => (
                                <button
                                  key={state.code}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, state: state.code });
                                    setShowStateDropdown(false);
                                  }}
                                  className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-blue-50 ${formData.state === state.code ? 'bg-blue-50' : ''}`}
                                >
                                  <span className="flex-1">{state.name}</span>
                                  <span className="text-xs text-gray-500">{state.code}</span>
                                </button>
                              ))}
                              {(!filteredStates || filteredStates.length === 0) && (
                                <div className="px-3 py-2 text-sm text-gray-500">{t('profile.noResults')}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">{t('profile.selectCountryFirst')}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile.address')}</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile.city')}</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile.number')}</label>
                    <input
                      type="text"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile.postcode')}</label>
                    <input
                      type="text"
                      value={formData.postcode}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? t('profile.saving') : t('profile.saveChanges')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    {t('profile.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      {t('profile.deleteConfirmTitle')}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {t('profile.deleteConfirmMessage')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? t('profile.deleting') : t('profile.confirmDelete')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  {t('profile.cancel')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
