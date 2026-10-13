'use client';

import { useEffect, useState } from 'react';
import { getSubscriptionStatus } from '@/api/subscriptions';
import { useAuth } from '@/context/AuthContext';
import { planEntitlements, type PlanEntitlements } from '@/lib/plan-entitlements';

// One request per signed-in user, shared by every component that asks (the header
// renders on every page). Cleared on failure so the next mount retries.
const cache = new Map<string, Promise<PlanEntitlements>>();

function loadEntitlements(userId: string, token: string): Promise<PlanEntitlements> {
    let pending = cache.get(userId);
    if (!pending) {
        pending = getSubscriptionStatus(token).then(planEntitlements);
        pending.catch(() => cache.delete(userId));
        cache.set(userId, pending);
    }
    return pending;
}

/** Forget cached entitlements, e.g. right after a plan change. */
export function invalidateEntitlements(): void {
    cache.clear();
}

/** The signed-in user's plan entitlements, or null while unknown / signed out. */
export function useEntitlements(): PlanEntitlements | null {
    const { user, firebaseToken } = useAuth();
    const userId = user?.id;
    const [state, setState] = useState<{ userId: string; entitlements: PlanEntitlements } | null>(null);

    useEffect(() => {
        if (!userId || !firebaseToken) return;
        let isActive = true;
        loadEntitlements(userId, firebaseToken)
            .then((entitlements) => {
                if (isActive) setState({ userId, entitlements });
            })
            .catch((error) => console.error('Failed to load plan entitlements:', error));
        return () => {
            isActive = false;
        };
    }, [userId, firebaseToken]);

    // Never hand one user's entitlements to the next after a sign-out/sign-in.
    return state && state.userId === userId ? state.entitlements : null;
}
