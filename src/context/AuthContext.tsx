'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getCurrentUser, signOut as authServiceSignOut } from '../lib/auth-service';
import { useDispatch } from 'react-redux';
import { setUser } from '@/store/slices/authSlice';
import type { AuthUser } from '../types/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is logged in, get their full profile
          const authUser = await getCurrentUser();
          setAuthUser(authUser);
          dispatch(setUser(authUser));
          try {
            document.cookie = `work4u_auth=1; Path=/; SameSite=Lax`;
          } catch { }
        } else {
          // User is logged out
          setAuthUser(null);
          dispatch(setUser(null));
          try {
            document.cookie = `work4u_auth=; Max-Age=0; Path=/; SameSite=Lax`;
          } catch { }
        }
      } catch (error) {
        console.error('Failed to get user:', error);
        setAuthUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await authServiceSignOut();
      setAuthUser(null);
      dispatch(setUser(null));
      try {
        document.cookie = `work4u_auth=; Max-Age=0; Path=/; SameSite=Lax`;
      } catch { }
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        signOut: handleSignOut,
      }}
    >
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
