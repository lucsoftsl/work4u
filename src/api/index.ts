import axios from "axios";
import { mockApi, type Job, type CreateJobPayload, type Application } from "./mocks";

const api = axios.create({
  // Default to the chat API host; override via NEXT_PUBLIC_API_URL
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  timeout: 10_000,
});

const useMocks = process.env.NEXT_PUBLIC_API_USE_MOCKS !== "false";

export async function fetchJobs() {
  if (useMocks) return mockApi.listJobs();
  const { data } = await api.get<Job[]>("/jobs");
  return data;
}

export async function fetchJob(id: string) {
  if (useMocks) return mockApi.getJob(id);
  const { data } = await api.get<Job>(`/jobs/${id}`);
  return data;
}

export async function createJob(payload: CreateJobPayload, createdByUserId?: string) {
  if (useMocks) return mockApi.createJob(payload, createdByUserId || "mock-user");
  const { data } = await api.post<Job>("/jobs", payload);
  return data;
}

export async function applyToJob(jobId: string, payload: Omit<Application, "id" | "status">) {
  if (useMocks) return mockApi.applyToJob(jobId, payload);
  const { data } = await api.post<Application>(`/jobs/${jobId}/apply`, payload);
  return data;
}

// Chat & user APIs
export async function fetchConversations(token: string) {
  const { data } = await api.get(`/api/messages/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function fetchMessagesWithUser(token: string, withUserId: string, options?: { limit?: number }) {
  const { data } = await api.get(`/api/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { withUserId, ...(options?.limit ? { limit: options.limit } : {}) },
  });
  return data;
}

export async function deleteUserAccount(token: string, userId: string) {
  await api.delete(`/api/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export { api };
export type { Job, Application, CreateJobPayload };
