'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
      <div className="flex items-center justify-center min-h-screen">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Profile Card */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Your Profile</h2>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Avatar and Name */}
            <div className="flex items-center space-x-4">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.displayName || 'User'}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xl font-medium text-gray-600">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-xl font-medium text-gray-900">{user.displayName}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            {/* User Details */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-500">Account Type</p>
                <p className="text-lg font-medium text-gray-900">{user.userType}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      user.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : user.status === 'PENDING_VERIFICATION'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.status}
                  </span>
                </div>
              </div>

              <div className="col-span-2">
                <p className="text-sm text-gray-500 mb-2">Worker Types</p>
                <div className="flex flex-wrap gap-2">
                  {user.workerTypes.length > 0 ? (
                    user.workerTypes.map((type) => (
                      <span
                        key={type}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {type === 'WORKER' ? '💼 Service Provider' : '📝 Task Poster'}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No roles selected</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">User ID</p>
            <p className="text-xs font-mono text-gray-600 break-all">{user.id}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Registered</p>
            <p className="text-lg font-medium text-gray-900">
              {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Account Status</p>
            <p className="text-lg font-medium text-gray-900">{user.status}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
