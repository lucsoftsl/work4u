import axios from "axios";
import { mockApi, type Job, type CreateJobPayload, type Application } from "./mocks";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
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

export async function createJob(payload: CreateJobPayload) {
  if (useMocks) return mockApi.createJob(payload);
  const { data } = await api.post<Job>("/jobs", payload);
  return data;
}

export async function applyToJob(jobId: string, payload: Omit<Application, "id" | "status">) {
  if (useMocks) return mockApi.applyToJob(jobId, payload);
  const { data } = await api.post<Application>(`/jobs/${jobId}/apply`, payload);
  return data;
}

export { api };
export type { Job, Application, CreateJobPayload };
