import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAchievements, setQuests } from '@/store/slices/gamificationSlice';
import { achievements, dailyQuests, mainQuests } from '@/data/gamification';
import type { Quest } from '@/types/gamification';

export function useInitializeGamification() {
    const dispatch = useDispatch();

    useEffect(() => {
        // Initialize achievements
        dispatch(setAchievements(achievements));

        // Initialize main story quests
        const initialQuests: Quest[] = mainQuests.slice(0, 3).map((quest, index) => ({
            ...quest,
            id: `main-quest-${index}`,
            status: index === 0 ? 'available' : 'available',
            progress: 0,
        }));

        // Add some daily quests
        const dailies: Quest[] = dailyQuests.slice(0, 2).map((quest, index) => ({
            ...quest,
            id: `daily-quest-${index}`,
            status: 'available',
            progress: 0,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        }));

        dispatch(setQuests([...initialQuests, ...dailies]));
    }, [dispatch]);
}
