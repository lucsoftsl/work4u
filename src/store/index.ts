import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './slices/authSlice';
import gamificationReducer from './slices/gamificationSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        gamification: gamificationReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
