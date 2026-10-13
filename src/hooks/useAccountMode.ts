'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser } from '@/types/auth';

export type AccountMode = 'REQUESTOR' | 'WORKER' | 'BOTH';
export type ViewMode = 'hiring' | 'working';

const VIEW_MODE_STORAGE_KEY = 'work4u_view_mode';
const DEFAULT_VIEW_MODE: ViewMode = 'hiring';

/**
 * The user's account mode. `accountMode` is authoritative; older profiles only
 * carry `workerTypes`, so fall back to those (both roles → BOTH, none → REQUESTOR).
 */
export function resolveAccountMode(
    user: Pick<AuthUser, 'accountMode' | 'workerTypes'> | null | undefined,
): AccountMode {
    if (user?.accountMode) return user.accountMode;
    const types = user?.workerTypes ?? [];
    const isWorker = types.includes('WORKER');
    const isRequestor = types.includes('REQUESTOR');
    if (isWorker && isRequestor) return 'BOTH';
    if (isWorker) return 'WORKER';
    return 'REQUESTOR';
}

// --- persisted "Hiring / Working" choice, shared across components -----------

const listeners = new Set<() => void>();

function readStoredViewMode(): ViewMode {
    try {
        const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
        return stored === 'working' || stored === 'hiring' ? stored : DEFAULT_VIEW_MODE;
    } catch {
        return DEFAULT_VIEW_MODE;
    }
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
        if (event.key === VIEW_MODE_STORAGE_KEY) listener();
    };
    window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
    };
}

function writeStoredViewMode(view: ViewMode): void {
    try {
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, view);
    } catch {
        // storage unavailable (private mode); the choice just won't persist
    }
    listeners.forEach((listener) => listener());
}

export interface AccountModeState {
    mode: AccountMode;
    /** Which link set / dashboard to show. Fixed for single-mode users. */
    view: ViewMode;
    /** Only meaningful for BOTH users. */
    setView: (view: ViewMode) => void;
}

export function useAccountMode(): AccountModeState {
    const { user } = useAuth();
    const mode = resolveAccountMode(user);
    const storedView = useSyncExternalStore(subscribe, readStoredViewMode, () => DEFAULT_VIEW_MODE);
    const setView = useCallback((next: ViewMode) => writeStoredViewMode(next), []);

    const view: ViewMode = mode === 'REQUESTOR' ? 'hiring' : mode === 'WORKER' ? 'working' : storedView;
    return { mode, view, setView };
}
