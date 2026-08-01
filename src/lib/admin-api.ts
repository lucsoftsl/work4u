import { AchievementForm, QuestForm } from '@/types/admin';
import type { Job, JobModerationStatus } from '@/api/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Achievement API calls — the :adminId path segment is kept for URL shape
// compatibility but is NOT trusted for authorization; the backend verifies
// the caller's own admin role from this Bearer token instead.
export async function fetchAchievements(adminId: string, token: string, filters?: Record<string, string>) {
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
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
    );

    if (!response.ok) throw new Error('Failed to fetch achievements');
    return response.json();
}

export async function createAchievement(adminId: string, token: string, achievement: AchievementForm) {
    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/achievements/${adminId}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(achievement),
        }
    );

    if (!response.ok) throw new Error('Failed to create achievement');
    return response.json();
}

export async function updateAchievement(
    adminId: string,
    token: string,
    achievementId: string,
    updates: Partial<AchievementForm>
) {
    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/achievements/${adminId}/${achievementId}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(updates),
        }
    );

    if (!response.ok) throw new Error('Failed to update achievement');
    return response.json();
}

export async function deleteAchievement(adminId: string, token: string, achievementId: string) {
    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/achievements/${adminId}/${achievementId}`,
        {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }
    );

    if (!response.ok) throw new Error('Failed to delete achievement');
    return response.json();
}

// Quest API calls — same note as above: :adminId is not trusted for auth.
export async function fetchQuests(adminId: string, token: string, filters?: Record<string, string>) {
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
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
    );

    if (!response.ok) throw new Error('Failed to fetch quests');
    return response.json();
}

export async function createQuest(adminId: string, token: string, quest: QuestForm) {
    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/quests/${adminId}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(quest),
        }
    );

    if (!response.ok) throw new Error('Failed to create quest');
    return response.json();
}

export async function updateQuest(
    adminId: string,
    token: string,
    questId: string,
    updates: Partial<QuestForm>
) {
    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/quests/${adminId}/${questId}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(updates),
        }
    );

    if (!response.ok) throw new Error('Failed to update quest');
    return response.json();
}

export async function deleteQuest(adminId: string, token: string, questId: string) {
    const response = await fetch(
        `${BASE_URL}/api/gamification/admin/quests/${adminId}/${questId}`,
        {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }
    );

    if (!response.ok) throw new Error('Failed to delete quest');
    return response.json();
}

export interface AdminStats {
    users: {
        byType: Record<string, number>;
        byStatus: Record<string, number>;
        newLast7Days: number;
    };
    jobs: {
        byLifecycleStatus: Record<string, number>;
        disputedCount: number;
    };
    business: {
        companies: number;
        shifts: number;
    };
    reports: {
        byStatus: Record<string, number>;
    };
    proSubscribers: number;
}

export async function fetchAdminStats(token: string): Promise<AdminStats> {
    const response = await fetch(`${BASE_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch admin stats');
    }
    return response.json();
}

// User management API calls
export interface AdminUserSummary {
    id: string;
    email: string;
    displayName: string | null;
    photoUrl: string | null;
    userType: 'ENTERPRISE' | 'PERSONAL' | 'ADMIN';
    status: 'ACTIVE' | 'PENDING_DELETION' | 'PENDING_VERIFICATION' | 'SUSPENDED';
    dateTimeCreated: string;
}

export async function fetchUsers(token: string, filters?: { status?: string; userType?: string }): Promise<AdminUserSummary[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.userType) params.append('userType', filters.userType);

    const response = await fetch(`${BASE_URL}/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
}

export async function suspendUser(userId: string, token: string): Promise<AdminUserSummary> {
    const response = await fetch(`${BASE_URL}/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to suspend user');
    }
    return response.json();
}

export async function reactivateUser(userId: string, token: string): Promise<AdminUserSummary> {
    const response = await fetch(`${BASE_URL}/api/admin/users/${userId}/reactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to reactivate user');
    }
    return response.json();
}

export type AdminGrantablePlan = 'free' | 'starter' | 'pro' | 'business';

export interface AdminSubscriptionGrant {
    userId: string;
    plan: AdminGrantablePlan;
    grantedByAdminId: string;
    activeFrom: string | null;
    activeTo: string | null;
}

export interface SetUserSubscriptionOptions {
    reason?: string;
    activeFrom?: string | null;
    activeTo?: string | null;
}

export async function setUserSubscription(
    userId: string,
    plan: AdminGrantablePlan,
    token: string,
    options?: SetUserSubscriptionOptions
): Promise<AdminSubscriptionGrant> {
    const response = await fetch(`${BASE_URL}/api/admin/users/${userId}/subscription`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            plan,
            reason: options?.reason,
            activeFrom: options?.activeFrom || null,
            activeTo: options?.activeTo || null,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to set subscription plan');
    }
    return response.json();
}

// Job moderation API calls
export async function fetchModeratedJobs(
    token: string,
    filters?: { moderationStatus?: JobModerationStatus }
): Promise<Job[]> {
    const params = new URLSearchParams();
    if (filters?.moderationStatus) params.append('moderationStatus', filters.moderationStatus);

    const response = await fetch(`${BASE_URL}/api/admin/jobs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch jobs');
    }
    return response.json();
}

export async function moderateJob(
    jobId: string,
    moderationStatus: JobModerationStatus,
    token: string,
    moderationNote?: string
): Promise<Job> {
    const response = await fetch(`${BASE_URL}/api/admin/jobs/${jobId}/moderation`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ moderationStatus, moderationNote }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to moderate job');
    }
    return response.json();
}

export async function scheduleJobDeletion(jobId: string, days: number, token: string): Promise<Job> {
    const response = await fetch(`${BASE_URL}/api/admin/jobs/${jobId}/schedule-deletion`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ days }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to schedule job deletion');
    }
    return response.json();
}

// Translation CMS API calls
export type TranslationLocale = 'en' | 'fr' | 'es' | 'hu' | 'ro';

export interface TranslationKeyEntry {
    key: string;
    values: Partial<Record<TranslationLocale, string>>;
    dateTimeCreated: string;
    dateTimeUpdated: string;
}

export interface TranslationListResult {
    entries: TranslationKeyEntry[];
    total: number;
    page: number;
    limit: number;
}

export async function fetchTranslations(
    token: string,
    options?: { search?: string; page?: number; limit?: number }
): Promise<TranslationListResult> {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));

    const response = await fetch(`${BASE_URL}/api/admin/translations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to fetch translations');
    return response.json();
}

export async function createTranslationKey(
    key: string,
    values: Partial<Record<TranslationLocale, string>>,
    token: string
): Promise<TranslationKeyEntry> {
    const response = await fetch(`${BASE_URL}/api/admin/translations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key, values }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create translation key');
    }
    return response.json();
}

export async function updateTranslationValues(
    key: string,
    values: Partial<Record<TranslationLocale, string>>,
    token: string
): Promise<TranslationKeyEntry> {
    const response = await fetch(`${BASE_URL}/api/admin/translations/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ values }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update translation values');
    }
    return response.json();
}

export async function deleteTranslationKey(key: string, token: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/admin/translations/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete translation key');
    }
}

// Triggers a Vercel redeploy of the frontend so its bundled src/locales/*.json
// files get resynced from the DB at build time (see scripts/sync-translations.mjs).
export async function triggerTranslationsDeploy(token: string): Promise<{ triggered: true }> {
    const response = await fetch(`${BASE_URL}/api/admin/translations/deploy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to trigger frontend deploy');
    }
    return response.json();
}
