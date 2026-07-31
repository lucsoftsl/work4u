import type { CreateReportPayload, Report, ResolveReportPayload } from "@/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const reportsApi = {
    async createReport(payload: CreateReportPayload, token: string): Promise<Report> {
        const response = await fetch(`${API_BASE_URL}/api/reports`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to submit report: ${response.statusText}`);
        }

        return response.json();
    },

    async listReports(token: string, filters?: { status?: string }): Promise<Report[]> {
        const params = new URLSearchParams();
        if (filters?.status) params.append("status", filters.status);

        const response = await fetch(`${API_BASE_URL}/api/admin/reports?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to fetch reports: ${response.statusText}`);
        }

        return response.json();
    },

    async resolveReport(reportId: string, payload: ResolveReportPayload, token: string): Promise<Report> {
        const response = await fetch(`${API_BASE_URL}/api/admin/reports/${reportId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to resolve report: ${response.statusText}`);
        }

        return response.json();
    },
};
