'use client';

import React, { createContext, useCallback, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getAuthUserFromFirebaseUser, signOut as authServiceSignOut } from '../lib/auth-service';
import { setTokenProvider } from '../lib/http';
import { ProfileUnavailableError, backoffDelay, isOutageError } from '../lib/auth-outage';
import { ConnectionBanner } from '../components/ConnectionBanner';
import type { AuthUser } from '../types/auth';

// Legacy Redux persistence key: it stored the whole user, ID token included. Cleared on load.
const LEGACY_STORAGE_KEY = 'work4u_auth_user';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Current Firebase ID token; kept fresh via onIdTokenChanged (hourly refresh). */
  firebaseToken: string | null;
  signOut: () => Promise<void>;
  /** Re-fetch the backend profile (after onboarding steps, profile edits, …). */
  refreshUser: () => Promise<AuthUser | null>;
  /** Apply a local patch to the user without a round trip. */
  updateUser: (patch: Partial<AuthUser>) => void;
  /** Signed in, but the API is unreachable: we keep retrying instead of showing the sign-in form. */
  connectionIssue: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setAuthCookie(signedIn: boolean) {
  try {
    document.cookie = signedIn
      ? `work4u_auth=1; Path=/; SameSite=Lax`
      : `work4u_auth=; Max-Age=0; Path=/; SameSite=Lax`;
  } catch {
    // cookies unavailable (private mode); routing falls back to client checks
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const retryRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; attempt: number; run: (() => void) | null }>({
    timer: null,
    attempt: 0,
    run: null,
  });

  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    // Every API call asks Firebase for the current token; the SDK refreshes it when it is near expiry.
    setTokenProvider(async (forceRefresh) => (auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null));
    return () => setTokenProvider(null);
  }, []);

  useEffect(() => {
    let lastUid: string | null = null;
    const retry = retryRef.current;

    const stopRetrying = () => {
      if (retry.timer) clearTimeout(retry.timer);
      retry.timer = null;
      retry.attempt = 0;
      retry.run = null;
      setConnectionIssue(false);
      setRateLimited(false);
    };

    // Profile fetch that survives an API outage: the person stays "signed in" (the auth SDK says so),
    // we show a retry banner and recover on our own when the API answers again.
    const loadProfile = async (authedUser: User) => {
      try {
        const authUser = await getAuthUserFromFirebaseUser(authedUser);
        stopRetrying();
        if (auth.currentUser?.uid !== authedUser.uid) return; // signed out / switched meanwhile
        setAuthUser(authUser);
        setAuthCookie(true);
        setLoading(false);
      } catch (error) {
        if (!isOutageError(error)) throw error;
        const limited = error instanceof ProfileUnavailableError && error.rateLimited;
        setConnectionIssue(true);
        setRateLimited(limited);
        retry.run = () => void loadProfile(authedUser).catch(() => undefined);
        // A 429 waits as long as the server's Retry-After says; anything else backs off 1s, 2s, 4s…
        const wait = limited && error instanceof ProfileUnavailableError && error.retryAfterMs ? error.retryAfterMs : backoffDelay(retry.attempt);
        retry.timer = setTimeout(() => {
          retry.attempt += 1;
          retry.run?.();
        }, wait);
      }
    };

    // onIdTokenChanged fires on sign-in, sign-out AND hourly token refresh.
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          lastUid = null;
          stopRetrying();
          setAuthUser(null);
          setFirebaseToken(null);
          setAuthCookie(false);
          setLoading(false);
          return;
        }
        // Offline with an expired token the refresh fails: that is an outage, not a sign-out.
        let token: string | null = null;
        try {
          token = await firebaseUser.getIdToken();
        } catch (tokenError) {
          if (!isOutageError(tokenError)) throw tokenError;
        }
        if (token) setFirebaseToken(token);
        if (firebaseUser.uid === lastUid) return; // token refresh only: profile unchanged
        lastUid = firebaseUser.uid;
        await loadProfile(firebaseUser);
      } catch (error) {
        console.error('Failed to get user:', error);
        lastUid = null;
        stopRetrying();
        setAuthUser(null);
        setFirebaseToken(null);
        setLoading(false);
      }
    });

    const retryNow = () => {
      if (!retry.run) return;
      if (retry.timer) clearTimeout(retry.timer);
      retry.attempt = 0;
      retry.run();
    };
    window.addEventListener('online', retryNow);

    return () => {
      unsubscribe();
      window.removeEventListener('online', retryNow);
      if (retry.timer) clearTimeout(retry.timer);
    };
  }, []);

  const retryProfileNow = useCallback(() => {
    const retry = retryRef.current;
    if (!retry.run) return;
    if (retry.timer) clearTimeout(retry.timer);
    retry.attempt = 0;
    retry.run();
  }, []);

  const refreshUser = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return null;
    try {
      const fresh = await getAuthUserFromFirebaseUser(current);
      setAuthUser(fresh);
      return fresh;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setAuthUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const handleSignOut = async () => {
    try {
      await authServiceSignOut();
    } finally {
      setAuthUser(null);
      setFirebaseToken(null);
      setAuthCookie(false);
      // Field-app data (queued actions, saved jobs) must not outlive the session; loaded lazily so B2C doesn't ship it.
      void import('../b2b/offline/store').then((m) => m.clearAllOfflineData()).catch(() => undefined);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        firebaseToken,
        signOut: handleSignOut,
        refreshUser,
        updateUser,
        connectionIssue,
      }}
    >
      {connectionIssue ? <ConnectionBanner onRetry={retryProfileNow} rateLimited={rateLimited} /> : null}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
