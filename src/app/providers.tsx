'use client';

import { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { LocaleProvider } from '@/lib/i18n';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { useInitializeGamification } from '@/hooks/useInitializeGamification';

function GamificationInitializer({ children }: { children: ReactNode }) {
    useInitializeGamification();
    return <>{children}</>;
}

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <LocaleProvider>
            <Provider store={store}>
                <AuthProvider>
                    <ChatProvider>
                        <GamificationInitializer>
                            {children}
                        </GamificationInitializer>
                    </ChatProvider>
                </AuthProvider>
            </Provider>
        </LocaleProvider>
    );
}
