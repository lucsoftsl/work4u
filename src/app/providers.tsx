'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { LocaleProvider, useTranslation } from '@/lib/i18n';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { useInitializeGamification } from '@/hooks/useInitializeGamification';
import { captureReferralCodeFromUrl } from '@/lib/referral';
import { updateUserProfile } from '@/lib/auth-service';

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
        updateUserProfile(user.id, { preferredLanguage: locale }).catch(() => {
            // Best-effort sync — chat translation just falls back to 'en' if this fails.
        });
    }, [locale, isAuthenticated, user?.id]);

    return <>{children}</>;
}

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <LocaleProvider>
            <Provider store={store}>
                <AuthProvider>
                    <ChatProvider>
                        <GamificationInitializer>
                            <ReferralCapture>
                                <LocaleSync>
                                    {children}
                                </LocaleSync>
                            </ReferralCapture>
                        </GamificationInitializer>
                    </ChatProvider>
                </AuthProvider>
            </Provider>
        </LocaleProvider>
    );
}
