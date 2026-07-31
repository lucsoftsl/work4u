import axios from "axios";
import { type Job, type CreateJobPayload, type Application } from "./types";

const api = axios.create({
  // Default to the chat API host; override via NEXT_PUBLIC_API_URL
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  timeout: 10_000,
});

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

export async function markMessageRead(token: string, messageId: string) {
  const { data } = await api.post(
    `/api/messages/${messageId}/read`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function deleteUserAccount(token: string, userId: string) {
  await api.delete(`/api/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export { api };
export type { Job, Application, CreateJobPayload };
