import type { MyReferralsResponse } from "@/api/types";

import { API_BASE_URL as API_BASE_URL, apiFetch } from "./http";

export const referralsApi = {
    async getMyReferrals(token: string): Promise<MyReferralsResponse> {
        const response = await apiFetch(`${API_BASE_URL}/api/referrals/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to fetch referrals: ${response.statusText}`);
        }

        return response.json();
    },
};
