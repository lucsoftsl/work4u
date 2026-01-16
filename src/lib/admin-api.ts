import { AchievementForm, QuestForm } from '@/types/admin';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Achievement API calls
export async function fetchAchievements(adminId: string, filters?: Record<string, string>) {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            params.append(key, value);
        });
    }

    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/achievements/${adminId}?${params}`,
        {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        }
    );

    if (!response.ok) throw new Error('Failed to fetch achievements');
    return response.json();
}

export async function createAchievement(adminId: string, achievement: AchievementForm) {
    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/achievements/${adminId}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(achievement),
        }
    );

    if (!response.ok) throw new Error('Failed to create achievement');
    return response.json();
}

export async function updateAchievement(
    adminId: string,
    achievementId: string,
    updates: Partial<AchievementForm>
) {
    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/achievements/${adminId}/${achievementId}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        }
    );

    if (!response.ok) throw new Error('Failed to update achievement');
    return response.json();
}

export async function deleteAchievement(adminId: string, achievementId: string) {
    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/achievements/${adminId}/${achievementId}`,
        {
            method: 'DELETE',
        }
    );

    if (!response.ok) throw new Error('Failed to delete achievement');
    return response.json();
}

// Quest API calls
export async function fetchQuests(adminId: string, filters?: Record<string, string>) {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            params.append(key, value);
        });
    }

    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/quests/${adminId}?${params}`,
        {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        }
    );

    if (!response.ok) throw new Error('Failed to fetch quests');
    return response.json();
}

export async function createQuest(adminId: string, quest: QuestForm) {
    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/quests/${adminId}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quest),
        }
    );

    if (!response.ok) throw new Error('Failed to create quest');
    return response.json();
}

export async function updateQuest(
    adminId: string,
    questId: string,
    updates: Partial<QuestForm>
) {
    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/quests/${adminId}/${questId}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        }
    );

    if (!response.ok) throw new Error('Failed to update quest');
    return response.json();
}

export async function deleteQuest(adminId: string, questId: string) {
    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/quests/${adminId}/${questId}`,
        {
            method: 'DELETE',
        }
    );

    if (!response.ok) throw new Error('Failed to delete quest');
    return response.json();
}
