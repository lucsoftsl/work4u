// Gamification types for the MMORPG-style work platform

export type QuestStatus = 'available' | 'active' | 'completed' | 'failed';
export type QuestDifficulty = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'jobs' | 'social' | 'profile' | 'earnings' | 'special';

export interface PlayerStats {
    level: number;
    currentXP: number;
    xpToNextLevel: number;
    totalXP: number;
    gold: number;
    completedJobs: number;
    activeQuests: number;
    completedQuests: number;
    achievements: number;
    streak: number; // Daily login streak
    title: string; // Player title (e.g., "Novice Worker", "Master Freelancer")
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    difficulty: QuestDifficulty;
    status: QuestStatus;
    progress: number;
    maxProgress: number;
    rewards: QuestReward;
    type: 'daily' | 'weekly' | 'main' | 'side';
    requirements?: string[];
    expiresAt?: Date;
    acceptedAt?: Date;
    completedAt?: Date;
}

export interface QuestReward {
    xp: number;
    gold: number;
    items?: InventoryItem[];
    title?: string;
    achievement?: string;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    category: AchievementCategory;
    rarity: QuestDifficulty;
    icon: string;
    unlocked: boolean;
    unlockedAt?: Date;
    progress: number;
    maxProgress: number;
    rewards: QuestReward;
    hidden?: boolean; // Hidden until unlocked
}

export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    type: 'badge' | 'boost' | 'cosmetic' | 'tool';
    rarity: QuestDifficulty;
    icon: string;
    effect?: {
        type: 'xp_boost' | 'gold_boost' | 'visibility_boost';
        value: number;
        duration?: number; // in hours
    };
    equipped?: boolean;
    obtainedAt: Date;
}

export interface PlayerTitle {
    id: string;
    name: string;
    description: string;
    rarity: QuestDifficulty;
    requirement: string;
    equipped: boolean;
}

export interface DailyChallenge extends Quest {
    resetTime: Date;
}

export interface LevelReward {
    level: number;
    rewards: QuestReward;
    unlocks?: string[]; // Features or areas unlocked
}

export interface Notification {
    id: string;
    type: 'achievement' | 'level_up' | 'quest_complete' | 'reward' | 'challenge';
    title: string;
    message: string;
    icon?: string;
    timestamp: Date;
    read: boolean;
}

export interface GamificationState {
    player: PlayerStats;
    quests: Quest[];
    achievements: Achievement[];
    inventory: InventoryItem[];
    titles: PlayerTitle[];
    notifications: Notification[];
    dailyChallenges: DailyChallenge[];
}
