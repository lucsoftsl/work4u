export interface AdminUser {
    id: string;
    userType: 'ADMIN' | 'PERSONAL' | 'ENTERPRISE';
}

export interface AchievementForm {
    id: string;
    name: Record<string, string>;
    description: Record<string, string>;
    category: 'jobs' | 'earnings' | 'profile' | 'social' | 'special';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    icon: string;
    maxProgress: number;
    rewards: {
        xp: number;
        gold: number;
        title?: Record<string, string>;
        item?: {
            id: string;
            name?: string;
            rarity?: string;
        };
    };
    hidden: boolean;
    enabled: boolean;
    requirements?: {
        action: string;
        threshold: number;
        details?: string;
    };
}

export interface QuestForm {
    id: string;
    title: Record<string, string>;
    description: Record<string, string>;
    type: 'daily' | 'weekly' | 'main' | 'side';
    difficulty: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    maxProgress: number;
    rewards: {
        xp: number;
        gold: number;
    };
    duration?: string;
    enabled: boolean;
    requirements?: {
        action?: string;
        threshold?: number;
        steps?: Array<{
            action: string;
            threshold: number;
        }>;
    };
}

export interface Achievement extends AchievementForm {
    createdAt: string;
    updatedAt: string;
}

export interface Quest extends QuestForm {
    createdAt: string;
    updatedAt: string;
}
