import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import {
    gamificationLoadFailed,
    gamificationLoadStarted,
    gamificationLoaded,
    resetGamification,
    setAchievements,
    setQuests,
    type ServerPlayerStats,
} from '@/store/slices/gamificationSlice';
import { achievements, dailyQuests, mainQuests } from '@/data/gamification';
import type { Quest } from '@/types/gamification';
import { useAuth } from '@/context/AuthContext';
import { apiJson } from '@/lib/http';

interface ServerGamificationState {
    player?: ServerPlayerStats | null;
}

/**
 * Loads the player's persisted XP/level from the backend (XP is only awarded
 * server-side). Failures leave the state in `error`, which keeps the XP UI hidden.
 */
export async function fetchGamificationState(userId: string, dispatch: AppDispatch): Promise<void> {
    dispatch(gamificationLoadStarted(userId));
    try {
        const data = await apiJson<ServerGamificationState>(
            `/api/gamification/state/${encodeURIComponent(userId)}`,
            { auth: true },
        );
        if (!data?.player) {
            dispatch(gamificationLoadFailed());
            return;
        }
        dispatch(gamificationLoaded({ userId, player: data.player }));
    } catch {
        dispatch(gamificationLoadFailed());
    }
}

export function useInitializeGamification() {
    const dispatch = useDispatch<AppDispatch>();
    const { user, loading } = useAuth();
    const userId = user?.id ?? null;

    useEffect(() => {
        // Static catalogue used by the achievement/quest UI.
        dispatch(setAchievements(achievements));

        const initialQuests: Quest[] = mainQuests.slice(0, 3).map((quest, index) => ({
            ...quest,
            id: `main-quest-${index}`,
            status: 'available',
            progress: 0,
        }));

        const dailies: Quest[] = dailyQuests.slice(0, 2).map((quest, index) => ({
            ...quest,
            id: `daily-quest-${index}`,
            status: 'available',
            progress: 0,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        }));

        dispatch(setQuests([...initialQuests, ...dailies]));
    }, [dispatch]);

    useEffect(() => {
        if (loading) return;
        if (!userId) {
            dispatch(resetGamification());
            return;
        }
        void fetchGamificationState(userId, dispatch);
    }, [dispatch, loading, userId]);
}
