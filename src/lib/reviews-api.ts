import type { CreateReviewPayload, Review } from "@/api/types";

import { API_BASE_URL as API_BASE_URL, apiFetch } from "./http";

export const reviewsApi = {
    async listReviews(params: { userId?: string; jobId?: string; createdByUserId?: string }): Promise<Review[]> {
        const queryParams = new URLSearchParams();
        if (params.userId) queryParams.append("userId", params.userId);
        if (params.jobId) queryParams.append("jobId", params.jobId);
        if (params.createdByUserId) queryParams.append("createdByUserId", params.createdByUserId);

        const response = await apiFetch(`${API_BASE_URL}/api/reviews?${queryParams}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch reviews: ${response.statusText}`);
        }

        return response.json();
    },

    async createReview(payload: CreateReviewPayload, token: string): Promise<Review> {
        const response = await apiFetch(`${API_BASE_URL}/api/reviews`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to submit review: ${response.statusText}`);
        }

        return response.json();
    },
};
