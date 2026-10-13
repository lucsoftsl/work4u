/**
 * Gamification Utilities
 *
 * XP, gold and achievements are awarded server-side from real marketplace
 * events (work4u-api src/lib/xp.ts). The client never grants progress itself;
 * after a relevant action it just re-reads the persisted player state.
 */

import { store } from '@/store';
import { fetchGamificationState } from '@/hooks/useInitializeGamification';

/** Re-read the signed-in player's state from the backend (no-op when none is loaded). */
export const refreshGamificationState = async (): Promise<void> => {
    const userId = store.getState().gamification.userId;
    if (!userId) return;
    await fetchGamificationState(userId, store.dispatch);
};

/** Call after a job is marked complete; the backend awards the XP. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleJobCompletion = (_jobBudget?: number): void => {
    void refreshGamificationState();
};

/** Call after a job application is submitted; the backend awards the XP. */
export const handleJobApplication = (): void => {
    void refreshGamificationState();
};

// player.title is stored as a literal English string (it comes from the
// backend) rather than a translation key, so it's mapped here at the display layer.
const PLAYER_TITLE_KEYS: Record<string, string> = {
    'Novice Worker': 'gamification.rank.noviceWorker',
    'Apprentice': 'gamification.rank.apprentice',
    'Skilled Worker': 'gamification.rank.skilledWorker',
    'Expert Freelancer': 'gamification.rank.expertFreelancer',
    'Master Professional': 'gamification.rank.masterProfessional',
    'Legendary Freelancer': 'gamification.rank.legendaryFreelancer',
};

export function getPlayerTitleKey(title: string): string {
    return PLAYER_TITLE_KEYS[title] ?? title;
}
