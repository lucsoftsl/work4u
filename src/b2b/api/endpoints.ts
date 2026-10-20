import { b2b, orgPath, newIdempotencyKey } from "./client";
import type {
  Assignment, Attachment, AttachmentCategory, ConflictCheck, CreateJobInput, DispatchBoard, Job, JobList, JobSortKey, JobStatus, JobWorkspace,
  MyJobs, NotificationItem, Part, PauseReason, UndoInfo, WorkTime, OrgEvent, OrgMe, OrgSummary, ScheduleCheck, SortDirection, TechAction, Team, TimelineEntry,
} from "./types";

// Typed endpoint functions + the query-key factory. Every key starts with ["org", orgId, …] so switching
// org can drop everything cached for the old org in one call.
export const qk = {
  org: (orgId: string) => ["org", orgId] as const,
  me: (orgId: string) => ["org", orgId, "me"] as const,
  parts: (orgId: string, jobId: string) => ["org", orgId, "job", jobId, "parts"] as const,
  jobs: (orgId: string, filters?: unknown) => ["org", orgId, "jobs", filters ?? {}] as const,
  jobsAll: (orgId: string) => ["org", orgId, "jobs"] as const,
  job: (orgId: string, jobId: string) => ["org", orgId, "job", jobId] as const,
  timeline: (orgId: string, jobId: string) => ["org", orgId, "job", jobId, "timeline"] as const,
  attachments: (orgId: string, jobId: string) => ["org", orgId, "job", jobId, "attachments"] as const,
  board: (orgId: string, date: string, filters?: unknown) => ["org", orgId, "board", date, filters ?? {}] as const,
  boardAll: (orgId: string) => ["org", orgId, "board"] as const,
  teams: (orgId: string) => ["org", orgId, "teams"] as const,
  dashboard: (orgId: string) => ["org", orgId, "dashboard"] as const,
  notifications: (orgId: string) => ["org", orgId, "notifications"] as const,
  myJobs: (orgId: string, date?: string) => ["org", orgId, "my-jobs", date ?? "today"] as const,
  myOrgs: ["my-orgs"] as const,
};

// ---- not tenant-scoped
export const listMyOrgs = () => b2b<OrgSummary[]>("/me/orgs");
export const createOrg = (input: { name: string; timezone?: string }) =>
  b2b<{ org: { id: string; name: string; timezone: string; status: string }; member: { id: string } }>("/orgs", { method: "POST", json: input });

/** B2B sign-up: creates the organisation (and a minimal profile row if the account has none). Needs no marketplace profile or plan. */
export interface CompanySignupInput {
  name: string; adminDisplayName?: string; timezone?: string; legalName?: string; taxId?: string; phone?: string;
  addressLine?: string; city?: string; postalCode?: string; country?: string; locale?: string;
  /** Optional: the company currency, chosen at creation. Omitted = the company starts without one. */
  currency?: string;
}
export const signupCompany = (input: CompanySignupInput) =>
  b2b<{ org: { id: string; name: string; timezone: string; status: string }; member: { id: string; roleId: string; roleTemplate: string } }>("/signup", { method: "POST", json: input });

export type DemoTeamSize = "1-5" | "6-20" | "21-50" | "51+";
export interface DemoRequestInput {
  name: string; email: string; company: string; phone?: string; teamSize?: DemoTeamSize; message?: string; locale?: string;
  /** Honeypot: always empty for people. */
  website?: string;
}
/** Public "Request a demo" form (no sign-in). 400 VALIDATION_ERROR carries `fields`; 429 after 5 an hour per IP. */
export const submitDemoRequest = (input: DemoRequestInput) => b2b<{ ok: true }>("/demo-requests", { method: "POST", json: input });

// ---- org + people
export const getMe = (orgId: string) => b2b<OrgMe>(orgPath(orgId, "/me"));
export const listTeams = (orgId: string) => b2b<Team[]>(orgPath(orgId, "/teams"));

// ---- jobs
export interface JobFilters {
  status?: JobStatus[]; teamId?: string; memberId?: string; customerId?: string; unassigned?: boolean;
  /** DRAFT view: only drafts created by the caller. */
  mine?: boolean; jobTypeId?: string;
  from?: string; to?: string; q?: string; limit?: number; offset?: number; cursor?: string;
  sort?: JobSortKey; dir?: SortDirection;
}
export const listJobs = (orgId: string, filters: JobFilters = {}, signal?: AbortSignal) =>
  b2b<JobList>(orgPath(orgId, "/jobs"), { query: { ...filters, status: filters.status }, signal });
export const createJob = (orgId: string, input: CreateJobInput) =>
  b2b<Job>(orgPath(orgId, "/jobs"), { method: "POST", json: input });
/** Draft -> NEW (same number). 422 DRAFT_INCOMPLETE {missing}; the body is {} because an empty JSON body is a 400. */
export const promoteJob = (orgId: string, jobId: string, version?: number) =>
  b2b<Job>(orgPath(orgId, `/jobs/${jobId}/promote`), { method: "POST", json: {}, ...(version !== undefined ? { ifMatch: version } : {}) });
export const getJob = (orgId: string, jobId: string) => b2b<JobWorkspace>(orgPath(orgId, `/jobs/${jobId}`));
export const patchJob = (orgId: string, jobId: string, version: number, patch: Record<string, unknown>) =>
  b2b<Job>(orgPath(orgId, `/jobs/${jobId}`), { method: "PATCH", json: patch, ifMatch: version });
export const transitionJob = (orgId: string, jobId: string, version: number, to: JobStatus, reason?: string) =>
  b2b<Job>(orgPath(orgId, `/jobs/${jobId}/transitions`), { method: "POST", json: { to, ...(reason ? { reason } : {}) }, ifMatch: version });
export const getTimeline = (orgId: string, jobId: string, before?: string | number) =>
  b2b<TimelineEntry[]>(orgPath(orgId, `/jobs/${jobId}/timeline`), { query: { before } });
export const approveReview = (orgId: string, jobId: string, version: number, note?: string) =>
  b2b<Job>(orgPath(orgId, `/jobs/${jobId}/review/approve`), { method: "POST", json: { note }, ifMatch: version });
export const sendBackReview = (orgId: string, jobId: string, version: number, reason: string) =>
  b2b<Job>(orgPath(orgId, `/jobs/${jobId}/review/send-back`), { method: "POST", json: { reason }, ifMatch: version });

// ---- assignments + schedule
export type AssignTarget = { teamId: string } | { memberId: string };
export const checkAssignment = (orgId: string, jobId: string, target: AssignTarget) =>
  b2b<ConflictCheck>(orgPath(orgId, `/jobs/${jobId}/assignments/check`), { method: "POST", json: target });
export const assignJob = (orgId: string, jobId: string, target: AssignTarget, override?: { reason: string }) =>
  b2b<{ id: string; conflictsOverridden: boolean; assignments: Assignment[] }>(orgPath(orgId, `/jobs/${jobId}/assignments`), {
    method: "POST",
    json: { ...target, ...(override ? { override } : {}) },
  });
export const unassignJob = (orgId: string, jobId: string, assignmentId: string) =>
  b2b<void>(orgPath(orgId, `/jobs/${jobId}/assignments/${assignmentId}`), { method: "DELETE" });
export const scheduleJob = (orgId: string, jobId: string, input: { start: string; end: string; override?: { reason: string }; expectedVersion?: number }) =>
  b2b<Job>(orgPath(orgId, `/jobs/${jobId}/schedule`), { method: "POST", json: input });

/** Dry run of a schedule change: nothing is written. Another dispatcher can still win before the save. */
export const checkSchedule = (orgId: string, jobId: string, window: { start: string; end: string }, signal?: AbortSignal) =>
  b2b<ScheduleCheck>(orgPath(orgId, `/jobs/${jobId}/schedule/check`), { method: "POST", json: window, signal });

// ---- dispatch
export interface BoardQuery { skillIds?: string[]; priorities?: string[] }
export const getBoard = (orgId: string, date: string, filters: BoardQuery = {}, signal?: AbortSignal) =>
  b2b<DispatchBoard>(orgPath(orgId, "/dispatch/board"), {
    query: { date, skillId: filters.skillIds?.length ? filters.skillIds.join(",") : undefined, priority: filters.priorities?.length ? filters.priorities.join(",") : undefined },
    signal,
  });

// ---- invitations (public preview, then accept as the signed-in invitee)
export interface InvitePreview { orgName: string; roleName: string; memberType: string; emailHint: string; expiresAt: string; /** A planned employee claims an existing member (keeps schedule and history). */ claim?: boolean; memberName?: string | null }
export const previewInvitation = (token: string) => b2b<InvitePreview>(`/invitations/${encodeURIComponent(token)}`);
/** `body.displayName`: the new member's own name (required by the API when the account has none; not used when claiming a planned employee). */
export const acceptInvitation = (token: string, body?: { displayName: string }) =>
  b2b<{ orgId: string; memberId: string }>(`/invitations/${encodeURIComponent(token)}/accept`, body ? { method: "POST", json: body } : { method: "POST" });

// ---- technician
export const getMyJobs = (orgId: string, date?: string, since?: string) => b2b<MyJobs>(orgPath(orgId, "/me/jobs"), { query: { date, since } });
export interface ActionBody { reason?: string; expectedVersion?: number; clientOccurredAt?: string; notes?: string; signatureName?: string; photoKeys?: string[] }
/** Pass the same `idempotencyKey` when retrying the same action. */
export const runAction = (orgId: string, jobId: string, action: TechAction, body: ActionBody = {}, idempotencyKey: string = newIdempotencyKey()) =>
  b2b<JobClockResponse>(orgPath(orgId, `/jobs/${jobId}/actions/${action}`), { method: "POST", json: body, idempotencyKey });
// ---- tech v2: pause/resume, undo, parts (migration 0008). Every write needs an Idempotency-Key.
export type JobClockResponse = Job & { time?: WorkTime | null; undo?: UndoInfo | null };
export const pauseWork = (orgId: string, jobId: string, body: { reason: PauseReason; note?: string; clientOccurredAt?: string }, idempotencyKey: string = newIdempotencyKey()) =>
  b2b<JobClockResponse>(orgPath(orgId, `/jobs/${jobId}/pause`), { method: "POST", json: body, idempotencyKey });
export const resumeWork = (orgId: string, jobId: string, body: { clientOccurredAt?: string } = {}, idempotencyKey: string = newIdempotencyKey()) =>
  b2b<JobClockResponse>(orgPath(orgId, `/jobs/${jobId}/resume-work`), { method: "POST", json: body, idempotencyKey });
export const undoJob = (orgId: string, jobId: string, body: { undoId?: number; clientOccurredAt?: string } = {}, idempotencyKey: string = newIdempotencyKey()) =>
  b2b<{ undone: { kind: string }; job: Job; time?: WorkTime | null; undo: null }>(orgPath(orgId, `/jobs/${jobId}/undo`), { method: "POST", json: body, idempotencyKey });

export interface PartInput { name: string; quantity: number; sku?: string | null; unit?: string | null; note?: string | null }
export interface PartWriteResponse { part: Part | null; deleted: boolean; jobVersion: number; undo?: UndoInfo | null }
export const listParts = (orgId: string, jobId: string) => b2b<{ items: Part[]; count: number }>(orgPath(orgId, `/jobs/${jobId}/parts`));
export const addPart = (orgId: string, jobId: string, id: string, input: PartInput, idempotencyKey: string = newIdempotencyKey(), clientOccurredAt?: string) =>
  b2b<PartWriteResponse>(orgPath(orgId, `/jobs/${jobId}/parts`), { method: "POST", json: { id, ...input, clientOccurredAt }, idempotencyKey });
export const editPart = (orgId: string, jobId: string, partId: string, input: Partial<PartInput>, idempotencyKey: string = newIdempotencyKey(), clientOccurredAt?: string) =>
  b2b<PartWriteResponse>(orgPath(orgId, `/jobs/${jobId}/parts/${partId}`), { method: "PATCH", json: { ...input, clientOccurredAt }, idempotencyKey });
export const removePart = (orgId: string, jobId: string, partId: string, idempotencyKey: string = newIdempotencyKey(), clientOccurredAt?: string) =>
  b2b<PartWriteResponse>(orgPath(orgId, `/jobs/${jobId}/parts/${partId}`), { method: "DELETE", json: { clientOccurredAt }, idempotencyKey });
export const toggleChecklist = (orgId: string, jobId: string, itemId: string, done: boolean) =>
  b2b<{ version?: number; undo?: UndoInfo | null } | undefined>(orgPath(orgId, `/jobs/${jobId}/checklist/${itemId}`), { method: "PATCH", json: { done } });
export const uploadPhoto = (orgId: string, jobId: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return b2b<{ key: string; version?: number }>(orgPath(orgId, `/jobs/${jobId}/photos`), { method: "POST", form });
};

// ---- attachments (503 MIGRATION_PENDING until migration 0004: treat as "not available")
export const listAttachments = (orgId: string, jobId: string, category?: AttachmentCategory) =>
  b2b<{ items: Attachment[]; urlTtlSeconds: number }>(orgPath(orgId, `/jobs/${jobId}/attachments`), { query: { category } });
export const uploadAttachment = (orgId: string, jobId: string, category: AttachmentCategory, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return b2b<Attachment>(orgPath(orgId, `/jobs/${jobId}/attachments`), { method: "POST", form, query: { category } });
};
export const deleteAttachment = (orgId: string, jobId: string, attachmentId: string) =>
  b2b<void>(orgPath(orgId, `/jobs/${jobId}/attachments/${attachmentId}`), { method: "DELETE" });

// ---- notifications (503 MIGRATION_PENDING → hide the bell)
export const listNotifications = (orgId: string, params: { unread?: boolean; before?: string | number; limit?: number } = {}) =>
  b2b<{ items: NotificationItem[]; unreadCount: number; nextBefore: string | number | null }>(orgPath(orgId, "/notifications"), { query: params });
export const unreadCount = (orgId: string) => b2b<{ count: number }>(orgPath(orgId, "/notifications/unread-count"));
export const markNotificationRead = (orgId: string, id: string | number) => b2b<{ id: string | number; read: true }>(orgPath(orgId, `/notifications/${id}/read`), { method: "POST" });
export const markAllNotificationsRead = (orgId: string) => b2b<{ updated: number }>(orgPath(orgId, "/notifications/read-all"), { method: "POST" });

// ---- realtime
export const streamToken = (orgId: string) => b2b<{ token: string; expiresInSeconds: number }>(orgPath(orgId, "/stream-token"), { method: "POST" });
export const pollEvents = (orgId: string, after?: string | number) => b2b<{ events: OrgEvent[]; cursor: string | number }>(orgPath(orgId, "/events"), { query: { after } });
