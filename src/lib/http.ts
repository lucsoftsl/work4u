// Single HTTP entry point for the backend API.
// - One normalised base URL (no more per-file `process.env.NEXT_PUBLIC_API_URL || ...` copies).
// - `apiFetch` is a drop-in `fetch` replacement: for authenticated calls it swaps in a fresh
//   Firebase ID token on every request and retries once with a forced refresh on 401.
// - `buildWsUrl` derives the chat socket URL (ws/wss) from the same base.

const DEFAULT_API_URL = "http://localhost:3001";

export function normalizeBaseUrl(raw: string | undefined | null): string {
  const value = (raw || DEFAULT_API_URL).trim().replace(/\/+$/, "");
  // Every call site appends `/api/...`, so a base that already ends in /api would double it.
  return value.replace(/\/api$/i, "");
}

export const API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

export function buildWsUrl(baseUrl: string, path: string, params: Record<string, string> = {}): string {
  const url = new URL(path, `${normalizeBaseUrl(baseUrl)}/`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export type TokenProvider = (forceRefresh: boolean) => Promise<string | null>;

let tokenProvider: TokenProvider | null = null;

/** Registered once by AuthProvider; kept injectable so this module has no Firebase import. */
export function setTokenProvider(provider: TokenProvider | null) {
  tokenProvider = provider;
}

export async function getFreshToken(forceRefresh = false): Promise<string | null> {
  if (!tokenProvider) return null;
  try {
    return await tokenProvider(forceRefresh);
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const RATE_LIMIT_MESSAGE = "You're doing that too often. Please wait a moment and try again.";
export const BUSY_MESSAGE = "The service is busy right now. Please try again in a moment.";
export const CONFLICT_MESSAGE = "This was changed by someone else in the meantime. Refresh and try again.";

/** Turns a failed Response into an ApiError with a human-readable message. */
export async function toApiError(res: Response, fallback = "Something went wrong. Please try again."): Promise<ApiError> {
  let body: { error?: unknown; message?: unknown; code?: unknown; details?: unknown } | null = null;
  try {
    body = await res.clone().json();
  } catch {
    body = null;
  }
  const serverMessage =
    (typeof body?.error === "string" && body.error) || (typeof body?.message === "string" && body.message) || "";
  const code = typeof body?.code === "string" ? body.code : undefined;

  if (res.status === 503 && code === "SERVICE_BUSY") return new ApiError(503, BUSY_MESSAGE, code, body?.details);
  if (res.status === 429) return new ApiError(429, RATE_LIMIT_MESSAGE, code ?? "RATE_LIMITED", body?.details);
  if (res.status === 409) return new ApiError(409, serverMessage || CONFLICT_MESSAGE, code ?? "CONFLICT", body?.details);
  return new ApiError(res.status, serverMessage || fallback, code, body?.details);
}

/** Error message for UI display, regardless of what was thrown. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function resolveUrl(input: string): string {
  return input.startsWith("/") ? `${API_BASE_URL}${input}` : input;
}

function withToken(headers: Headers, token: string | null): Headers {
  const next = new Headers(headers);
  if (token) next.set("Authorization", `Bearer ${token}`);
  return next;
}

/**
 * fetch() replacement for backend calls. A request is treated as authenticated when it
 * carries an Authorization header (legacy callers pass the context token) or sets `auth: true`.
 */
export async function apiFetch(input: string, init: RequestInit & { auth?: boolean } = {}): Promise<Response> {
  const { auth, ...rest } = init;
  const url = resolveUrl(input);
  const baseHeaders = new Headers(rest.headers);
  const wantsAuth = auth === true || baseHeaders.has("Authorization");

  if (!wantsAuth) return fetch(url, { ...rest, headers: baseHeaders });

  const fresh = await getFreshToken(false);
  const first = await fetch(url, { ...rest, headers: withToken(baseHeaders, fresh) });
  if (first.status !== 401) return first;

  const refreshed = await getFreshToken(true);
  if (!refreshed) return first;
  return fetch(url, { ...rest, headers: withToken(baseHeaders, refreshed) });
}

// Identical GETs that are in flight at the same moment share one request (the chat page and its socket hook both load the same
// history on open; reconnects repeat it). Only while pending: nothing is cached, the next call is a fresh request.
const inflightGets = new Map<string, Promise<unknown>>();

async function fetchJson<T>(input: string, init: RequestInit & { auth?: boolean }): Promise<T> {
  const res = await apiFetch(input, init);
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** JSON convenience wrapper: throws ApiError on non-2xx, returns undefined on 204. Concurrent identical GETs are shared. */
export async function apiJson<T>(input: string, init: RequestInit & { auth?: boolean; json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (json !== undefined) headers.set("Content-Type", "application/json");
  const request = { ...rest, headers, body: json !== undefined ? JSON.stringify(json) : rest.body };

  const isPlainGet = (rest.method ?? "GET").toUpperCase() === "GET" && request.body == null && !rest.signal;
  if (!isPlainGet) return fetchJson<T>(input, request);

  const key = `${input}|${init.auth ? "auth" : ""}|${headers.get("Authorization") ?? ""}`;
  const pending = inflightGets.get(key);
  if (pending) return structuredClone(await pending) as T; // each caller gets its own copy: nobody can mutate another's data
  const promise = fetchJson<T>(input, request).finally(() => inflightGets.delete(key));
  inflightGets.set(key, promise);
  return promise;
}
