'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { LocaleProvider, useTranslation, type Locale } from '@/lib/i18n';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { useInitializeGamification } from '@/hooks/useInitializeGamification';
import { captureReferralCodeFromUrl } from '@/lib/referral';
import { ToastProvider } from '@/components/ui/Toast';

function GamificationInitializer({ children }: { children: ReactNode }) {
    useInitializeGamification();
    return <>{children}</>;
}

function ReferralCapture({ children }: { children: ReactNode }) {
    useEffect(() => {
        captureReferralCodeFromUrl();
    }, []);
    return <>{children}</>;
}

function LocaleSync({ children }: { children: ReactNode }) {
    const { locale } = useTranslation();
    const { user, isAuthenticated } = useAuth();
    const syncedLocaleRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !user?.id) return;
        if (syncedLocaleRef.current === locale) return;
        syncedLocaleRef.current = locale;
        // Loaded on demand: the profile service pulls in the sign-in SDK, which must not be in every page's first-load bundle.
        import('@/lib/auth-service')
            .then((m) => m.updateUserProfile(user.id, { preferredLanguage: locale }))
            .catch(() => {
                // Best-effort sync — chat translation just falls back to 'en' if this fails.
            });
    }, [locale, isAuthenticated, user?.id]);

    return <>{children}</>;
}

interface ProvidersProps {
    children: ReactNode;
    initialLocale?: Locale;
    initialDictionary?: Record<string, string>;
}

export default function Providers({ children, initialLocale, initialDictionary }: ProvidersProps) {
    return (
        <LocaleProvider initialLocale={initialLocale} initialDictionary={initialDictionary}>
            <Provider store={store}>
                <AuthProvider>
                    <ChatProvider>
                        <GamificationInitializer>
                            <ReferralCapture>
                                <LocaleSync>
                                    <ToastProvider>{children}</ToastProvider>
                                </LocaleSync>
                            </ReferralCapture>
                        </GamificationInitializer>
                    </ChatProvider>
                </AuthProvider>
            </Provider>
        </LocaleProvider>
    );
}
