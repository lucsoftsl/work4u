'use client';

import { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { LocaleProvider } from '@/lib/i18n';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <LocaleProvider>
            <Provider store={store}>
                <AuthProvider>
                    <ChatProvider>
                        {children}
                    </ChatProvider>
                </AuthProvider>
            </Provider>
        </LocaleProvider>
    );
}
