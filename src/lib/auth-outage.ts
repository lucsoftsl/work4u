// Helpers for two sign-in safety nets:
//  1. credentials must never sit in the URL (a form submitted before hydration falls back to GET),
//  2. an unreachable API must not look like being signed out.

const SENSITIVE_PARAMS = [
  "email", "password", "pass", "pwd", "confirmPassword",
  "token", "idToken", "id_token", "access_token", "accessToken", "refresh_token", "refreshToken", "auth_token", "authToken", "api_key", "apiKey", "oobCode",
];

/** Removes credential-like query params. Returns the cleaned relative URL, or null when nothing changed. */
export function stripCredentialParams(href: string): string | null {
  const url = new URL(href, "http://localhost");
  let changed = false;
  for (const name of SENSITIVE_PARAMS) {
    if (url.searchParams.has(name)) {
      url.searchParams.delete(name);
      changed = true;
    }
  }
  // OAuth implicit flows put tokens in the fragment: "#access_token=…&id_token=…"
  let hash = url.hash;
  if (hash.includes("=")) {
    const frag = new URLSearchParams(hash.slice(1));
    let fragChanged = false;
    for (const name of SENSITIVE_PARAMS) if (frag.has(name)) { frag.delete(name); fragChanged = true; }
    if (fragChanged) {
      changed = true;
      const rest = frag.toString();
      hash = rest ? `#${rest}` : "";
    }
  }
  if (!changed) return null;
  return `${url.pathname}${url.search}${hash}`;
}

/** Thrown when the backend can't be reached (network error or 5xx) while Firebase says we're signed in. */
export class ProfileUnavailableError extends Error {
  /** HTTP 429: reachable but throttling us; the UI says so instead of "can't reach". */
  readonly rateLimited: boolean;
  readonly retryAfterMs?: number;
  constructor(message = "Profile service unavailable", opts: { rateLimited?: boolean; retryAfterMs?: number } = {}) {
    super(message);
    this.name = "ProfileUnavailableError";
    this.rateLimited = opts.rateLimited ?? false;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

/** 429, or 503 that says it is only busy (Retry-After header or SERVICE_BUSY code): wait and retry, don't look offline. */
export function isBusyResponse(status: number, retryAfterHeader: string | null | undefined, code: string | undefined): boolean {
  return status === 429 || (status === 503 && (!!retryAfterHeader || code === "SERVICE_BUSY"));
}

const RETRY_AFTER_MIN_MS = 1_000;
const RETRY_AFTER_MAX_MS = 120_000;
/** `Retry-After` (seconds or HTTP date) as a clamped delay in ms; undefined when absent or unparseable. */
export function parseRetryAfterMs(header: string | null | undefined, now: number = Date.now()): number | undefined {
  if (!header) return undefined;
  const value = header.trim();
  let ms: number;
  if (/^\d+$/.test(value)) ms = Number(value) * 1000;
  else {
    const at = Date.parse(value);
    if (!Number.isFinite(at)) return undefined;
    ms = at - now;
  }
  return Math.min(Math.max(ms, RETRY_AFTER_MIN_MS), RETRY_AFTER_MAX_MS);
}

/** True for failures that mean "try again later", not "this person has no profile". */
export function isOutageError(error: unknown): boolean {
  if (error instanceof ProfileUnavailableError) return true;
  // fetch() rejects with a TypeError on network failure; the auth SDK reports a failed token refresh like this
  if (error instanceof TypeError) return true;
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "auth/network-request-failed";
}

export function isOutageStatus(status: number): boolean {
  // 429: the API is rate limiting us (many tabs, a reload burst): wait and retry, don't look signed out
  return status >= 500 || status === 0 || status === 408 || status === 429;
}

const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];
/** 1s, 2s, 4s, 8s, then 15s for every further attempt. */
export function backoffDelay(attempt: number): number {
  return BACKOFF_MS[Math.min(Math.max(attempt, 0), BACKOFF_MS.length - 1)];
}
