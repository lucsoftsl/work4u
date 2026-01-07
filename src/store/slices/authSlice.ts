import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '@/types/auth';

const STORAGE_KEY = 'work4u_auth_user';

function loadUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
        return null;
    }
}

function saveUser(user: AuthUser | null) {
    if (typeof window === 'undefined') return;
    try {
        if (user) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore storage errors
    }
}

interface AuthState {
    user: AuthUser | null;
}

const initialState: AuthState = {
    user: loadUser(),
};

const slice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser(state, action: PayloadAction<AuthUser | null>) {
            state.user = action.payload;
            saveUser(action.payload);
        },
    },
});

export const { setUser } = slice.actions;
export const authReducer = slice.reducer;
