'use client';

import { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { LocaleProvider } from '@/lib/i18n';
import { AuthProvider } from '@/context/AuthContext';

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <LocaleProvider>
            <Provider store={store}>
                <AuthProvider>{children}</AuthProvider>
            </Provider>
        </LocaleProvider>
    );
}
