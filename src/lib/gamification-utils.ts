/**
 * Gamification Utilities
 * Helper functions to integrate gamification features throughout the app
 */

import { store } from '@/store';
import {
    gainXP,
    gainGold,
    completeJob,
    unlockAchievement,
    updateQuestProgress,
    updateAchievementProgress,
    incrementStreak,
} from '@/store/slices/gamificationSlice';

/**
 * Call this when a user completes a job
 */
export const handleJobCompletion = (jobBudget: number) => {
    const xpReward = calculateXPReward(jobBudget);
    const goldReward = Math.floor(jobBudget / 10);

    store.dispatch(completeJob({
        xp: xpReward,
        gold: goldReward,
    }));

    // Update quest progress
    store.dispatch(updateQuestProgress({ questId: 'daily-grind', progress: 1 }));

    // Update achievements
    const state = store.getState();
    const completedJobs = state.gamification.player.completedJobs;

    // Check for achievement unlocks
    if (completedJobs === 1) {
        store.dispatch(unlockAchievement('first-job'));
    }
    if (completedJobs === 10) {
        store.dispatch(unlockAchievement('job-veteran'));
    }
    if (completedJobs === 50) {
        store.dispatch(unlockAchievement('job-master'));
    }
    if (completedJobs === 100) {
        store.dispatch(unlockAchievement('job-legend'));
    }

    // Update job completion achievement progress
    store.dispatch(updateAchievementProgress({ achievementId: 'job-veteran', progress: completedJobs }));
    store.dispatch(updateAchievementProgress({ achievementId: 'job-master', progress: completedJobs }));
    store.dispatch(updateAchievementProgress({ achievementId: 'job-legend', progress: completedJobs }));
};

/**
 * Call this when a user applies to a job
 */
export const handleJobApplication = () => {
    // Update daily quest progress
    store.dispatch(updateQuestProgress({ questId: 'daily-grind', progress: 1 }));

    // Award small XP for engagement
    store.dispatch(gainXP(10));
};

/**
 * Call this when a user sends a message
 */
export const handleMessageSent = () => {
    const state = store.getState();
    const achievements = state.gamification.achievements;

    const firstChatAchievement = achievements.find(a => a.id === 'first-chat');
    if (firstChatAchievement && !firstChatAchievement.unlocked) {
        store.dispatch(unlockAchievement('first-chat'));
    }

    // Update network builder quest
    store.dispatch(updateQuestProgress({ questId: 'network-builder', progress: 1 }));
};

/**
 * Call this when user logs in daily
 */
export const handleDailyLogin = () => {
    store.dispatch(incrementStreak());

    const state = store.getState();
    const streak = state.gamification.player.streak;

    // Unlock streak achievements
    if (streak === 7) {
        store.dispatch(unlockAchievement('streak-7'));
    }
    if (streak === 30) {
        store.dispatch(unlockAchievement('streak-30'));
    }

    // Update progress
    store.dispatch(updateAchievementProgress({ achievementId: 'streak-7', progress: streak }));
    store.dispatch(updateAchievementProgress({ achievementId: 'streak-30', progress: streak }));

    // Daily login bonus
    store.dispatch(gainXP(50));
    store.dispatch(gainGold(25));
};

/**
 * Call this when user completes their profile
 */
export const handleProfileCompletion = () => {
    store.dispatch(unlockAchievement('profile-complete'));
    store.dispatch(gainXP(300));
    store.dispatch(gainGold(150));
};

/**
 * Calculate XP reward based on job budget
 */
const calculateXPReward = (budget: number): number => {
    if (budget >= 5000) return 500;
    if (budget >= 2000) return 300;
    if (budget >= 1000) return 200;
    if (budget >= 500) return 100;
    return 50;
};

/**
 * Check and update gold-based achievements
 */
export const checkGoldAchievements = () => {
    const state = store.getState();
    const gold = state.gamification.player.gold;

    if (gold >= 100) {
        const achievement = state.gamification.achievements.find(a => a.id === 'first-gold');
        if (achievement && !achievement.unlocked) {
            store.dispatch(unlockAchievement('first-gold'));
        }
    }

    if (gold >= 10000) {
        const achievement = state.gamification.achievements.find(a => a.id === 'gold-collector');
        if (achievement && !achievement.unlocked) {
            store.dispatch(unlockAchievement('gold-collector'));
        }
    }

    if (gold >= 100000) {
        const achievement = state.gamification.achievements.find(a => a.id === 'wealthy');
        if (achievement && !achievement.unlocked) {
            store.dispatch(unlockAchievement('wealthy'));
        }
    }

    // Update progress
    store.dispatch(updateAchievementProgress({ achievementId: 'first-gold', progress: gold }));
    store.dispatch(updateAchievementProgress({ achievementId: 'gold-collector', progress: gold }));
    store.dispatch(updateAchievementProgress({ achievementId: 'wealthy', progress: gold }));
};

/**
 * Check level-based achievements
 */
export const checkLevelAchievements = () => {
    const state = store.getState();
    const level = state.gamification.player.level;

    if (level >= 10) {
        const achievement = state.gamification.achievements.find(a => a.id === 'level-10');
        if (achievement && !achievement.unlocked) {
            store.dispatch(unlockAchievement('level-10'));
        }
    }

    if (level >= 50) {
        const achievement = state.gamification.achievements.find(a => a.id === 'level-50');
        if (achievement && !achievement.unlocked) {
            store.dispatch(unlockAchievement('level-50'));
        }
    }

    // Update progress
    store.dispatch(updateAchievementProgress({ achievementId: 'level-10', progress: level }));
    store.dispatch(updateAchievementProgress({ achievementId: 'level-50', progress: level }));
};
