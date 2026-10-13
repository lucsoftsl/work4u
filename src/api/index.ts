/* eslint-disable @typescript-eslint/no-explicit-any -- backend payloads are untyped; callers narrow them */
import { apiJson } from "@/lib/http";
import { type Job, type CreateJobPayload, type Application } from "./types";

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

// Chat & user APIs (all go through the shared client in src/lib/http.ts)
// Several components ask for the conversation list on every navigation/focus/poll. They share one request
// (in flight) and one result (fresh for CONVERSATIONS_STALE_MS); a send/read/receive invalidates it.
const CONVERSATIONS_STALE_MS = 10_000;
let conversationsCache: { token: string; at: number; promise: Promise<any> } | null = null;

export function invalidateConversations() { conversationsCache = null; }

export function fetchConversations(token: string, opts: { force?: boolean } = {}) {
  const hit = conversationsCache;
  if (!opts.force && hit && hit.token === token && Date.now() - hit.at < CONVERSATIONS_STALE_MS) return hit.promise;
  const promise = apiJson<any>(`/api/messages/conversations`, { headers: authHeaders(token), cache: "no-store" });
  const entry = { token, at: Date.now(), promise };
  conversationsCache = entry;
  promise.catch(() => { if (conversationsCache === entry) conversationsCache = null; }); // never cache a failure
  return promise;
}

export async function fetchMessagesWithUser(token: string, withUserId: string, options?: { limit?: number }) {
  const params = new URLSearchParams({ withUserId });
  if (options?.limit) params.set("limit", String(options.limit));
  return apiJson<any>(`/api/messages?${params.toString()}`, { headers: authHeaders(token), cache: "no-store" });
}

export async function sendMessageHttp(
  token: string,
  payload: { toUserId: string; text: string; jobId?: string; jobTitle?: string }
) {
  const sent = await apiJson<any>(`/api/messages`, { method: "POST", headers: authHeaders(token), json: payload });
  invalidateConversations();
  return sent;
}

export async function markMessageRead(token: string, messageId: string) {
  const read = await apiJson<any>(`/api/messages/${messageId}/read`, { method: "POST", headers: authHeaders(token), json: {} });
  invalidateConversations();
  return read;
}

export async function deleteUserAccount(token: string, userId: string) {
  await apiJson<void>(`/api/users/${userId}`, { method: "DELETE", headers: authHeaders(token) });
}

export type { Job, Application, CreateJobPayload };
