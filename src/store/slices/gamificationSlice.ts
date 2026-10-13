import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
    GamificationState,
    PlayerStats,
    Quest,
    Achievement,
    InventoryItem,
    QuestReward
} from '@/types/gamification';

// Calculate XP required for next level (exponential curve)
const calculateXPForLevel = (level: number): number => {
    return Math.floor(100 * Math.pow(1.5, level - 1));
};

// Initialize player with default stats
const initialPlayerStats: PlayerStats = {
    level: 1,
    currentXP: 0,
    xpToNextLevel: calculateXPForLevel(1),
    totalXP: 0,
    gold: 0,
    completedJobs: 0,
    activeQuests: 0,
    completedQuests: 0,
    achievements: 0,
    streak: 0,
    title: 'Novice Worker',
};

/** Lifecycle of the server-side player state; the UI only shows progress once `loaded`. */
export type GamificationServerStatus = 'idle' | 'loading' | 'loaded' | 'error';

/** Player stats as returned by GET /api/gamification/state/:userId (work4u-api). */
export interface ServerPlayerStats {
    level: number;
    xp: number;
    /** XP still needed to reach the next level. */
    xpToNextLevel: number;
    totalXp: number;
    gold: number;
    title?: string | null;
    streak: number;
    achievements: number;
    activeQuests: number;
    completedQuests: number;
}

// Mirrors work4u-api's flat curve (src/controllers/gamification.ts): 1000 XP per level.
const SERVER_XP_PER_LEVEL = 1000;

export interface GamificationSliceState extends GamificationState {
    serverStatus: GamificationServerStatus;
    /** Owner of the loaded player state, so a refetch knows whom to ask for. */
    userId: string | null;
}

const toNumber = (value: unknown, fallback = 0): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const initialState: GamificationSliceState = {
    serverStatus: 'idle',
    userId: null,
    player: initialPlayerStats,
    quests: [],
    achievements: [],
    inventory: [],
    titles: [],
    notifications: [],
    dailyChallenges: [],
};

const gamificationSlice = createSlice({
    name: 'gamification',
    initialState,
    reducers: {
        // Server sync
        gamificationLoadStarted: (state, action: PayloadAction<string>) => {
            if (state.userId !== action.payload) {
                state.player = initialPlayerStats;
                state.serverStatus = 'loading';
            }
            state.userId = action.payload;
        },

        gamificationLoaded: (state, action: PayloadAction<{ userId: string; player: ServerPlayerStats }>) => {
            const server = action.payload.player;
            const level = Math.max(1, toNumber(server.level, 1));
            const remaining = Math.max(0, toNumber(server.xpToNextLevel, SERVER_XP_PER_LEVEL));
            state.userId = action.payload.userId;
            state.serverStatus = 'loaded';
            state.player = {
                ...state.player,
                level,
                totalXP: Math.max(0, toNumber(server.totalXp)),
                xpToNextLevel: SERVER_XP_PER_LEVEL,
                currentXP: Math.min(SERVER_XP_PER_LEVEL, Math.max(0, SERVER_XP_PER_LEVEL - remaining)),
                gold: toNumber(server.gold),
                streak: toNumber(server.streak),
                achievements: toNumber(server.achievements),
                activeQuests: toNumber(server.activeQuests),
                completedQuests: toNumber(server.completedQuests),
                title: typeof server.title === 'string' ? server.title : '',
            };
        },

        gamificationLoadFailed: (state) => {
            state.serverStatus = 'error';
        },

        // Keeps the static achievement/quest catalogue; drops everything player-specific.
        resetGamification: (state) => {
            state.serverStatus = 'idle';
            state.userId = null;
            state.player = initialPlayerStats;
            state.inventory = [];
            state.titles = [];
            state.notifications = [];
            state.dailyChallenges = [];
        },

        // XP and Leveling
        gainXP: (state, action: PayloadAction<number>) => {
            const xpGained = action.payload;
            state.player.currentXP += xpGained;
            state.player.totalXP += xpGained;

            // Check for level up
            while (state.player.currentXP >= state.player.xpToNextLevel) {
                state.player.currentXP -= state.player.xpToNextLevel;
                state.player.level += 1;
                state.player.xpToNextLevel = calculateXPForLevel(state.player.level);

                // Add level up notification
                state.notifications.push({
                    id: `level-up-${Date.now()}`,
                    type: 'level_up',
                    title: 'Level Up!',
                    message: `Congratulations! You reached level ${state.player.level}!`,
                    timestamp: new Date().toISOString(),
                    read: false,
                });

                // Update title based on level
                if (state.player.level === 5) state.player.title = 'Apprentice';
                if (state.player.level === 10) state.player.title = 'Skilled Worker';
                if (state.player.level === 20) state.player.title = 'Expert Freelancer';
                if (state.player.level === 30) state.player.title = 'Master Professional';
                if (state.player.level === 50) state.player.title = 'Legendary Freelancer';
            }
        },

        // Gold management
        gainGold: (state, action: PayloadAction<number>) => {
            state.player.gold += action.payload;
        },

        spendGold: (state, action: PayloadAction<number>) => {
            if (state.player.gold >= action.payload) {
                state.player.gold -= action.payload;
            }
        },

        // Quest management
        addQuest: (state, action: PayloadAction<Quest>) => {
            state.quests.push(action.payload);
            if (action.payload.status === 'active') {
                state.player.activeQuests += 1;
            }
        },

        updateQuestProgress: (state, action: PayloadAction<{ questId: string; progress: number }>) => {
            const quest = state.quests.find(q => q.id === action.payload.questId);
            if (quest) {
                quest.progress = Math.min(action.payload.progress, quest.maxProgress);

                // Auto-complete quest when progress reaches max
                if (quest.progress >= quest.maxProgress && quest.status === 'active') {
                    quest.status = 'completed';
                    quest.completedAt = new Date().toISOString();
                    state.player.activeQuests -= 1;
                    state.player.completedQuests += 1;

                    // Add notification
                    state.notifications.push({
                        id: `quest-complete-${Date.now()}`,
                        type: 'quest_complete',
                        title: 'Quest Completed!',
                        message: `${quest.title} has been completed!`,
                        timestamp: new Date().toISOString(),
                        read: false,
                    });
                }
            }
        },

        acceptQuest: (state, action: PayloadAction<string>) => {
            const quest = state.quests.find(q => q.id === action.payload);
            if (quest && quest.status === 'available') {
                quest.status = 'active';
                quest.acceptedAt = new Date().toISOString();
                state.player.activeQuests += 1;
            }
        },

        completeQuest: (state, action: PayloadAction<string>) => {
            const quest = state.quests.find(q => q.id === action.payload);
            if (quest && quest.status === 'active') {
                quest.status = 'completed';
                quest.completedAt = new Date().toISOString();
                state.player.activeQuests -= 1;
                state.player.completedQuests += 1;

                // Award rewards
                state.player.currentXP += quest.rewards.xp;
                state.player.totalXP += quest.rewards.xp;
                state.player.gold += quest.rewards.gold;

                // Add items to inventory
                if (quest.rewards.items) {
                    quest.rewards.items.forEach(item => {
                        state.inventory.push(item);
                    });
                }
            }
        },

        // Achievement management
        unlockAchievement: (state, action: PayloadAction<string>) => {
            const achievement = state.achievements.find(a => a.id === action.payload);
            if (achievement && !achievement.unlocked) {
                achievement.unlocked = true;
                achievement.unlockedAt = new Date().toISOString();
                state.player.achievements += 1;

                // Award rewards
                state.player.currentXP += achievement.rewards.xp;
                state.player.totalXP += achievement.rewards.xp;
                state.player.gold += achievement.rewards.gold;

                // Add notification
                state.notifications.push({
                    id: `achievement-${Date.now()}`,
                    type: 'achievement',
                    title: 'Achievement Unlocked!',
                    message: `${achievement.name} - ${achievement.description}`,
                    icon: achievement.icon,
                    timestamp: new Date().toISOString(),
                    read: false,
                });
            }
        },

        updateAchievementProgress: (state, action: PayloadAction<{ achievementId: string; progress: number }>) => {
            const achievement = state.achievements.find(a => a.id === action.payload.achievementId);
            if (achievement) {
                achievement.progress = Math.min(action.payload.progress, achievement.maxProgress);

                // Auto-unlock when progress is complete
                if (achievement.progress >= achievement.maxProgress && !achievement.unlocked) {
                    achievement.unlocked = true;
                    achievement.unlockedAt = new Date().toISOString();
                    state.player.achievements += 1;
                }
            }
        },

        // Inventory management
        addItem: (state, action: PayloadAction<InventoryItem>) => {
            state.inventory.push(action.payload);
        },

        equipItem: (state, action: PayloadAction<string>) => {
            const item = state.inventory.find(i => i.id === action.payload);
            if (item) {
                // Unequip other items of same type
                state.inventory.forEach(i => {
                    if (i.type === item.type && i.equipped) {
                        i.equipped = false;
                    }
                });
                item.equipped = true;
            }
        },

        unequipItem: (state, action: PayloadAction<string>) => {
            const item = state.inventory.find(i => i.id === action.payload);
            if (item) {
                item.equipped = false;
            }
        },

        // Notifications
        markNotificationRead: (state, action: PayloadAction<string>) => {
            const notification = state.notifications.find(n => n.id === action.payload);
            if (notification) {
                notification.read = true;
            }
        },

        clearNotifications: (state) => {
            state.notifications = state.notifications.filter(n => !n.read);
        },

        // Streak management
        incrementStreak: (state) => {
            state.player.streak += 1;
        },

        resetStreak: (state) => {
            state.player.streak = 0;
        },

        // Job completion tracking
        completeJob: (state, action: PayloadAction<QuestReward>) => {
            state.player.completedJobs += 1;

            // Award rewards
            state.player.currentXP += action.payload.xp;
            state.player.totalXP += action.payload.xp;
            state.player.gold += action.payload.gold;

            // Add items if any
            if (action.payload.items) {
                action.payload.items.forEach(item => {
                    state.inventory.push(item);
                });
            }
        },

        // Initialize achievements
        setAchievements: (state, action: PayloadAction<Achievement[]>) => {
            state.achievements = action.payload;
        },

        // Initialize quests
        setQuests: (state, action: PayloadAction<Quest[]>) => {
            state.quests = action.payload;
        },
    },
});

export const {
    gamificationLoadStarted,
    gamificationLoaded,
    gamificationLoadFailed,
    resetGamification,
    gainXP,
    gainGold,
    spendGold,
    addQuest,
    updateQuestProgress,
    acceptQuest,
    completeQuest,
    unlockAchievement,
    updateAchievementProgress,
    addItem,
    equipItem,
    unequipItem,
    markNotificationRead,
    clearNotifications,
    incrementStreak,
    resetStreak,
    completeJob,
    setAchievements,
    setQuests,
} = gamificationSlice.actions;

export default gamificationSlice.reducer;
