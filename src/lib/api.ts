/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Job } from "@/api/mocks";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const api = {
    async listJobs(params?: {
        status?: string;
        category?: string;
        limit?: number;
        offset?: number;
    }): Promise<Job[]> {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append("status", params.status);
        if (params?.category) queryParams.append("category", params.category);
        if (params?.limit) queryParams.append("limit", String(params.limit));
        if (params?.offset) queryParams.append("offset", String(params.offset));

        const url = `${API_BASE_URL}/api/jobs${queryParams.toString() ? `?${queryParams}` : ""}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to list jobs: ${response.statusText}`);
        }

        return response.json();
    },

    async getJob(jobId: string): Promise<Job> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Job not found");
            }
            throw new Error(`Failed to fetch job: ${response.statusText}`);
        }

        return response.json();
    },

    async createJob(payload: any, token: string): Promise<Job> {
        const response = await fetch(`${API_BASE_URL}/api/jobs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to create job: ${response.statusText}`);
        }

        return response.json();
    },

    async updateJob(jobId: string, payload: any, token: string): Promise<Job> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to update job: ${response.statusText}`);
        }

        return response.json();
    },

    async deleteJob(jobId: string, token: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to delete job: ${response.statusText}`);
        }
    },

    async searchJobs(params?: {
        keywords?: string;
        location?: string;
        remote?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<Job[]> {
        const queryParams = new URLSearchParams();
        if (params?.keywords) queryParams.append("keywords", params.keywords);
        if (params?.location) queryParams.append("location", params.location);
        if (params?.remote !== undefined) queryParams.append("remote", String(params.remote));
        if (params?.limit) queryParams.append("limit", String(params.limit));
        if (params?.offset) queryParams.append("offset", String(params.offset));

        const url = `${API_BASE_URL}/api/jobs/search${queryParams.toString() ? `?${queryParams}` : ""}`;
        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to search jobs: ${response.statusText}`);
        }

        return response.json();
    },
};
