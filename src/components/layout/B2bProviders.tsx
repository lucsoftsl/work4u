"use client";

import type { ReactNode } from "react";
import { LocaleProvider } from "@/lib/i18n";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * Providers of the logged-in B2B app (ops console, field app, invitation page, B2B sign-in/start): language, sign-in (a marketplace
 * profile is optional) and toasts. No marketplace state: no Redux store, chat, gamification, referral capture, profile-language sync.
 */
export function B2bProviders({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider kind="b2b">
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
