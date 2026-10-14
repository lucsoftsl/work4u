import { API_BASE_URL, apiFetch } from "@/lib/http";
import { isBusyResponse, parseRetryAfterMs } from "@/lib/auth-outage";
import { observeServerTime } from "@/b2b/lib/server-clock";
import { newClientId } from "@/lib/chat-outbox";
import type { Conflict } from "./types";

// Single entry point for /api/b2b. Builds on the shared client (fresh ID token per request, one retry
// on 401) and adds: org-scoped paths, If-Match, Idempotency-Key, and typed errors that keep the API's
// extra fields (conflicts, currentVersion, missing…).

export type B2bErrorCode =
  | "VALIDATION_ERROR" | "INVALID_REFERENCE" | "REASON_REQUIRED" | "IDEMPOTENCY_KEY_REQUIRED" | "FORBIDDEN"
  | "OVERRIDE_FORBIDDEN" | "INVITE_EMAIL_MISMATCH" | "ACCOUNT_INACTIVE" | "SIGNUP_INCOMPLETE" | "NOT_FOUND"
  | "INVITE_INVALID" | "INVITE_EXPIRED" | "INVITE_USED" | "INVITE_REVOKED" | "INVALID_TRANSITION" | "GUARD_FAILED" | "COMPLETION_REQUIREMENTS_MISSING"
  | "EVIDENCE_UNAVAILABLE" | "EVIDENCE_REQUIRED" | "VERSION_CONFLICT" | "ASSIGNMENT_CONFLICT" | "ASSIGNMENT_LOCKED" | "SCHEDULE_REQUIRED" | "ALREADY_MEMBER"
  | "LAST_ADMIN" | "IDEMPOTENCY_IN_PROGRESS" | "IDEMPOTENCY_KEY_REUSED" | "PRECONDITION_REQUIRED"
  | "RESOURCE_IN_USE" | "MIGRATION_PENDING" | "SIGNED_URL_INVALID" | "UNSUPPORTED_FILE_TYPE"
  | "RATE_LIMITED" | "SERVICE_BUSY" | "JOB_PAUSED" | "ALREADY_PAUSED" | "NOT_PAUSED" | "NOTHING_TO_UNDO" | "UNDO_NOT_ALLOWED" | "UNDO_NOT_POSSIBLE" | "UNDO_WINDOW_EXPIRED" | "PARTS_LIMIT_REACHED" | "NETWORK" | "UNKNOWN";

export class B2bError extends Error {
  readonly status: number;
  readonly code: B2bErrorCode;
  /** Whole error body, e.g. `{conflicts}`, `{currentVersion, currentStatus}`, `{missing}`, `{fields}`. */
  readonly body: Record<string, unknown>;
  /** From the `Retry-After` header of a 429, in milliseconds. */
  readonly retryAfterMs?: number;

  constructor(status: number, code: B2bErrorCode, message: string, body: Record<string, unknown> = {}, retryAfterMs?: number) {
    super(message);
    this.name = "B2bError";
    this.status = status;
    this.code = code;
    this.body = body;
    this.retryAfterMs = retryAfterMs;
  }

  /** 429, or 503 SERVICE_BUSY: the API is reachable but overloaded; wait for Retry-After. */
  get isRateLimited() { return this.status === 429 || (this.status === 503 && this.code === "SERVICE_BUSY"); }
  get isConflict() { return this.status === 409; }
  get isVersionConflict() { return this.code === "VERSION_CONFLICT"; }
  /** Feature not available yet (notifications/attachments before migration 0004): hide the UI, don't show an error. */
  get isMigrationPending() { return this.status === 503 && this.code === "MIGRATION_PENDING"; }
  get isNotFound() { return this.status === 404; }
  get currentVersion(): number | undefined { return typeof this.body.currentVersion === "number" ? this.body.currentVersion : undefined; }
  get currentStatus(): string | undefined { return typeof this.body.currentStatus === "string" ? this.body.currentStatus : undefined; }
  get missing(): string[] { return Array.isArray(this.body.missing) ? (this.body.missing as string[]) : []; }
  get conflicts(): Conflict[] { return Array.isArray(this.body.conflicts) ? (this.body.conflicts as Conflict[]) : []; }
  get fields(): Record<string, string> { return (this.body.fields as Record<string, string>) ?? {}; }
}

export function isB2bError(e: unknown): e is B2bError { return e instanceof B2bError; }

export interface B2bRequest {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  json?: unknown;
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined | null | Array<string | number>>;
  /** Job version for optimistic locking; sent as `If-Match: "<version>"`. */
  ifMatch?: number;
  /** Required by technician actions; reuse the SAME key when retrying the same action. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export function buildQuery(query: B2bRequest["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)));
    else params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function newIdempotencyKey(): string {
  return newClientId();
}

/** Maps a failed Response to a B2bError (pure helper, exported for tests). */
export async function toB2bError(res: Response): Promise<B2bError> {
  let body: Record<string, unknown> = {};
  try {
    const parsed = await res.clone().json();
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    body = {};
  }
  const message =
    typeof body.error === "string" ? body.error : typeof body.message === "string" ? body.message : `Request failed (${res.status})`;
  let code = (typeof body.code === "string" ? body.code : "UNKNOWN") as B2bErrorCode;
  if (res.status === 429) code = "RATE_LIMITED";
  return new B2bError(res.status, code, message, body, isBusyResponse(res.status, res.headers.get("Retry-After"), code)
      ? parseRetryAfterMs(res.headers.get("Retry-After") ?? (typeof body.retryAfterSeconds === "number" ? String(body.retryAfterSeconds) : null))
      : undefined);
}

export async function b2b<T>(path: string, req: B2bRequest = {}): Promise<T> {
  const headers = new Headers();
  let body: BodyInit | undefined;
  if (req.form) body = req.form; // the browser sets the multipart boundary
  else if (req.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(req.json);
  }
  if (req.ifMatch !== undefined) headers.set("If-Match", `"${req.ifMatch}"`);
  if (req.idempotencyKey) headers.set("Idempotency-Key", req.idempotencyKey);

  let res: Response;
  const sentAt = Date.now();
  try {
    res = await apiFetch(`/api/b2b${path}${buildQuery(req.query)}`, {
      method: req.method ?? (body ? "POST" : "GET"),
      headers,
      body,
      signal: req.signal,
      auth: true,
      cache: "no-store",
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new B2bError(0, "NETWORK", "Can't reach the server. Check your connection.");
  }
  if (!res.ok) throw await toB2bError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = (text ? JSON.parse(text) : undefined) as T;
  learnServerTime(data, res, sentAt);
  return data;
}

/** Learn the server clock from the most precise timestamp in a response: `serverTime` (me/jobs), `time.serverTime` (job), else the `Date` header. */
function learnServerTime(data: unknown, res: Response, sentAt: number) {
  const o = data && typeof data === "object" ? (data as { serverTime?: unknown; time?: { serverTime?: unknown } | null }) : undefined;
  const iso = typeof o?.serverTime === "string" ? o.serverTime : typeof o?.time?.serverTime === "string" ? o.time.serverTime : res.headers?.get?.("Date");
  observeServerTime(iso, sentAt, Date.now());
}

/** Org-scoped prefix: `/orgs/:orgId`. */
export const orgPath = (orgId: string, path = "") => `/orgs/${encodeURIComponent(orgId)}${path}`;

/** Signed attachment URLs come back relative; prefix the API base (they need no Authorization header). */
export const absoluteApiUrl = (relative: string) => (relative.startsWith("http") ? relative : `${API_BASE_URL}${relative}`);
