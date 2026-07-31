import type { MyReferralsResponse } from "@/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const referralsApi = {
    async getMyReferrals(token: string): Promise<MyReferralsResponse> {
        const response = await fetch(`${API_BASE_URL}/api/referrals/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to fetch referrals: ${response.statusText}`);
        }

        return response.json();
    },
};
