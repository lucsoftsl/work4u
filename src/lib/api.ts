/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
    Application,
    CreateApplicationPayload,
    ApplicationStatus,
    Job,
    MyApplication,
    WorkerListing,
    NearbyWorkerListing,
    CreateListingPayload,
    UpdateListingPayload,
    JobChecklistItem,
    JobWorkPhoto,
} from "@/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

    async getNearbyWorkers(
        jobId: string,
        params: { radiusKm?: number; category?: string } | undefined,
        token: string
    ): Promise<NearbyWorkerListing[]> {
        const queryParams = new URLSearchParams();
        if (params?.radiusKm) queryParams.append("radiusKm", String(params.radiusKm));
        if (params?.category) queryParams.append("category", params.category);

        const url = `${API_BASE_URL}/api/jobs/${jobId}/nearby-workers${queryParams.toString() ? `?${queryParams}` : ""}`;
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to fetch nearby workers: ${response.statusText}`);
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

    async getMyJobs(userId: string, token: string): Promise<Job[]> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/user/${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to fetch your jobs: ${response.statusText}`);
        }

        return response.json();
    },

    async boostJob(jobId: string, token: string): Promise<Job> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/boost`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to boost job: ${response.statusText}`);
        }

        return response.json();
    },

    async completeJob(jobId: string, token: string): Promise<Job> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/complete`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to mark job as completed: ${response.statusText}`);
        }

        return response.json();
    },

    async updateWorkStage(jobId: string, workStage: "EN_ROUTE" | "STARTED" | "AWAITING_REVIEW", token: string): Promise<Job> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/work-stage`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ workStage }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to update job stage: ${response.statusText}`);
        }

        return response.json();
    },

    async markJobPaid(jobId: string, paymentMethod: "CASH" | "BANK_TRANSFER", token: string): Promise<Job> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/payment`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ paymentMethod }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to mark job as paid: ${response.statusText}`);
        }

        return response.json();
    },

    async listJobWorkPhotos(jobId: string, token: string): Promise<JobWorkPhoto[]> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/photos`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to load job photos: ${response.statusText}`);
        }

        return response.json();
    },

    async addJobWorkPhoto(jobId: string, imageUrl: string, token: string, caption?: string): Promise<JobWorkPhoto> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/photos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ imageUrl, caption }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to add job photo: ${response.statusText}`);
        }

        return response.json();
    },

    async deleteJobWorkPhoto(jobId: string, photoId: string, token: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/photos/${photoId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to delete job photo: ${response.statusText}`);
        }
    },

    async confirmJobPayment(jobId: string, token: string): Promise<Job> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/payment/confirm`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to confirm payment: ${response.statusText}`);
        }

        return response.json();
    },

    async applyToJob(jobId: string, payload: CreateApplicationPayload, token: string): Promise<Application> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/applications`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to apply to job: ${response.statusText}`);
        }

        return response.json();
    },

    async getJobApplicants(jobId: string, token: string): Promise<Application[]> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/applications`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to fetch applicants: ${response.statusText}`);
        }

        return response.json();
    },

    async getMyApplications(userId: string, token: string): Promise<MyApplication[]> {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/applications`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to fetch applications: ${response.statusText}`);
        }

        return response.json();
    },

    async updateApplicationStatus(applicationId: string, status: ApplicationStatus, token: string): Promise<Application> {
        const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to update application: ${response.statusText}`);
        }

        return response.json();
    },

    async listListings(params?: { category?: string; availability?: string; workerId?: string }): Promise<WorkerListing[]> {
        const queryParams = new URLSearchParams();
        if (params?.category) queryParams.append("category", params.category);
        if (params?.availability) queryParams.append("availability", params.availability);
        if (params?.workerId) queryParams.append("workerId", params.workerId);

        const url = `${API_BASE_URL}/api/worker-listings${queryParams.toString() ? `?${queryParams}` : ""}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to list worker listings: ${response.statusText}`);
        }

        return response.json();
    },

    async searchListings(params?: { keywords?: string; category?: string; location?: string }): Promise<WorkerListing[]> {
        const queryParams = new URLSearchParams();
        if (params?.keywords) queryParams.append("keywords", params.keywords);
        if (params?.category) queryParams.append("category", params.category);
        if (params?.location) queryParams.append("location", params.location);

        const url = `${API_BASE_URL}/api/worker-listings/search${queryParams.toString() ? `?${queryParams}` : ""}`;
        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to search worker listings: ${response.statusText}`);
        }

        return response.json();
    },

    async getListing(listingId: string): Promise<WorkerListing> {
        const response = await fetch(`${API_BASE_URL}/api/worker-listings/${listingId}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Listing not found");
            }
            throw new Error(`Failed to fetch listing: ${response.statusText}`);
        }

        return response.json();
    },

    async getMyListings(userId: string, token: string): Promise<WorkerListing[]> {
        const response = await fetch(`${API_BASE_URL}/api/worker-listings/user/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to fetch your listings: ${response.statusText}`);
        }

        return response.json();
    },

    async createListing(payload: CreateListingPayload, token: string): Promise<WorkerListing> {
        const response = await fetch(`${API_BASE_URL}/api/worker-listings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to create listing: ${response.statusText}`);
        }

        return response.json();
    },

    async updateListing(listingId: string, payload: UpdateListingPayload, token: string): Promise<WorkerListing> {
        const response = await fetch(`${API_BASE_URL}/api/worker-listings/${listingId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to update listing: ${response.statusText}`);
        }

        return response.json();
    },

    async deleteListing(listingId: string, token: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/api/worker-listings/${listingId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to delete listing: ${response.statusText}`);
        }
    },

    async getChecklist(jobId: string, token: string): Promise<JobChecklistItem[]> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/checklist`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to fetch checklist: ${response.statusText}`);
        }

        return response.json();
    },

    async addChecklistItem(jobId: string, text: string, token: string): Promise<JobChecklistItem> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/checklist`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to add checklist item: ${response.statusText}`);
        }

        return response.json();
    },

    async updateChecklistItem(
        jobId: string,
        itemId: string,
        payload: { text?: string; isDone?: boolean },
        token: string
    ): Promise<JobChecklistItem> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/checklist/${itemId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to update checklist item: ${response.statusText}`);
        }

        return response.json();
    },

    async deleteChecklistItem(jobId: string, itemId: string, token: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/checklist/${itemId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to delete checklist item: ${response.statusText}`);
        }
    },
};
