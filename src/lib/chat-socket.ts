import { API_BASE_URL, ApiError, buildWsUrl } from "@/lib/http";

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
/** Subprotocol the API selects when the ID token is passed in Sec-WebSocket-Protocol (no token in the URL). */
export const CHAT_AUTH_PROTOCOL = "work4u.auth";
/** Close codes from the API: 4003 = account not active → don't hammer the server with reconnects. */
export const CLOSE_ACCOUNT_INACTIVE = 4003;

/** Exponential backoff with a cap: 1s, 2s, 4s … 30s. */
export function reconnectDelay(attempt: number): number {
    return Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** Math.max(0, attempt));
}

/** Socket URL; the token travels in the subprotocol header, never in the URL. */
export function chatSocketUrl(baseUrl: string = API_BASE_URL): string {
    return buildWsUrl(baseUrl, "/api/messages/ws");
}

export function chatSocketProtocols(token: string): string[] {
    return [CHAT_AUTH_PROTOCOL, token];
}

/** Server ordering: time, then id, so equal timestamps don't flip between renders. */
export function compareMessages(a: { dateTimeCreated: string; id: string }, b: { dateTimeCreated: string; id: string }): number {
    const diff = new Date(a.dateTimeCreated).getTime() - new Date(b.dateTimeCreated).getTime();
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
}

export function dedupeSorted<T extends { id: string; dateTimeCreated: string }>(messages: T[]): T[] {
    return Array.from(new Map(messages.map((m) => [m.id, m])).values()).sort(compareMessages);
}

/** 4xx other than 408/429 means the request itself is wrong: retrying won't help. */
export function isRetryableSendError(err: unknown): boolean {
    if (err instanceof ApiError) return err.status === 408 || err.status === 429 || err.status >= 500 || err.status === 401;
    return true; // network errors (server down, offline, CORS during restart)
}

