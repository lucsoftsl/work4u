// Types for the B2B API (/api/b2b). Source: b2b/impl-log-backend.md "API reference". Times are ISO-8601 UTC.

export type JobStatus =
  | "NEW" | "PLANNING" | "WAITING_FOR_PARTS" | "READY_TO_SCHEDULE" | "SCHEDULED" | "DISPATCHED"
  | "EN_ROUTE" | "ON_SITE" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "REVIEW" | "CLOSED" | "CANCELLED";

export type Scope = "ALL" | "TEAM" | "ASSIGNED";
export interface Grant { permission: string; scope: Scope }
export type TeamStatus = "AVAILABLE" | "ASSIGNED" | "TRAVELLING" | "ON_SITE" | "BREAK" | "OFFLINE";

export interface OrgSummary {
  id: string; name: string; timezone: string; memberId: string;
  role: { name: string; template: string };
}

export interface OrgMe {
  org: { id: string; name: string; timezone: string };
  member: { id: string; displayName: string; memberType: string; teamIds: string[] };
  role: { id: string; name: string; template: string };
  permissions: Grant[];
  /** Site-wide policies. Absent on older APIs: treat as strict (false). */
  policies?: { allowApprovalWithoutEvidence: boolean };
}

export interface JobRequirements { checklist: boolean; notes: boolean; photo: boolean; signature: boolean; review: boolean }
export interface ChecklistItem { id: string; text: string; done: boolean }

export type PauseReason = "BREAK" | "PARTS" | "CUSTOMER_AWAY" | "OTHER";
export type ClockState = "NOT_STARTED" | "RUNNING" | "PAUSED" | "STOPPED";
/** Work clock summary from the API: derived from timestamped events, never counted by the client. */
export interface WorkTime {
  state: ClockState;
  workedSeconds: number;
  pausedSeconds: number;
  correctionSeconds: number;
  runningSince: string | null;
  pausedSince: string | null;
  pauseReason: PauseReason | null;
  pauseNote: string | null;
  workStartedAt: string | null;
  workEndedAt: string | null;
  byMember?: Record<string, number>;
  serverTime: string;
}
export interface Part {
  id: string;
  jobId: string;
  name: string;
  sku: string | null;
  quantity: number;
  unit: string | null;
  note: string | null;
  createdByMemberId?: string;
  createdAt: string;
  updatedAt: string;
}
export interface UndoInfo { id: number; kind: string; expiresInSeconds: number }

export interface Job {
  id: string;
  number: number;
  reference: string; // "JOB-1001"
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" | string;
  status: JobStatus;
  blockedFromStatus?: JobStatus | null;
  statusReason?: string | null;
  customerId: string;
  locationId: string;
  requestedDate?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  estimatedDurationMin?: number | null;
  slaDueAt?: string | null;
  internalNotes?: string | null; // omitted for ASSIGNED-scope members
  customerNotes?: string | null;
  requirements: JobRequirements;
  checklist: ChecklistItem[];
  completionNotes?: string | null;
  photoKeys?: string[];
  signature?: { name: string; signedAt: string } | null;
  timestamps: Partial<Record<"dispatchedAt" | "enRouteAt" | "arrivedAt" | "startedAt" | "completedAt" | "closedAt" | "cancelledAt", string | null>>;
  reopenedCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  /** Work clock + parts (migration 0008); absent on older APIs. */
  time?: WorkTime | null;
  parts?: Part[];
  undo?: UndoInfo | null;
  // present on some read models
  customerName?: string;
  locationLabel?: string;
}

export interface Assignment {
  id: string;
  teamId?: string | null;
  memberId?: string | null;
  role?: "TEAM" | "LEAD" | "TECHNICIAN" | "SPECIALIST";
  teamName?: string;
  memberName?: string;
}

export interface JobWorkspace extends Job {
  customer: { id: string; name: string; email?: string | null; phone?: string | null; [k: string]: unknown };
  location: {
    id: string; label: string; addressLine: string; city?: string | null; postalCode?: string | null; country?: string | null;
    latitude?: number | null; longitude?: number | null; accessInstructions?: string | null; safetyInstructions?: string | null;
  };
  navigationUrl?: string | null;
  assignments: Assignment[];
  requiredSkills: { id: string; name: string }[];
  missingCompletion: Array<"checklist" | "notes" | "photo" | "signature">;
  previousJobs: Array<Pick<Job, "id" | "reference" | "title" | "status">>;
}

export type JobSortKey = "scheduledStart" | "createdAt" | "updatedAt" | "number" | "title" | "priority" | "status";
export type SortDirection = "asc" | "desc";

/** Envelope shared by every paged list (jobs, review queue, opt-in customers). */
export interface Paged<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
  nextCursor: string | null;
}
export interface JobList extends Paged<Job> { sort: JobSortKey; dir: SortDirection }

export type ConflictType = "TEAM_TIME_OVERLAP" | "MEMBER_TIME_OVERLAP" | "SKILL_MISSING" | "ALREADY_ASSIGNED";
export interface Conflict {
  type: ConflictType;
  message: string;
  jobId?: string; jobNumber?: number; start?: string; end?: string; skillIds?: string[];
}
export interface ConflictCheck { conflicts: Conflict[]; canOverride: boolean }
/** POST /jobs/:id/schedule/check: a dry run, nothing is written. */
export interface ScheduleCheck extends ConflictCheck { version: number; status: JobStatus; resultingStatus: JobStatus }

export type CapacitySource = "team" | "members" | "default";
export interface LaneCapacity { workingMinutes: number; bookedMinutes: number; utilization: number | null; source: CapacitySource }

export interface DispatchBoard {
  range: { from: string; to: string };
  unassigned: Job[];
  teams: Array<{ id: string; name: string; status: TeamStatus; jobs: Job[]; capacity?: LaneCapacity }>;
  individuals: Job[];
  /** Echo of the server-side filters that were applied. */
  filters?: { skillIds: string[]; priorities: string[] };
}

export interface TimelineEntry {
  id: string | number;
  occurredAt: string;
  clientOccurredAt?: string | null;
  category: "CUSTOMER" | "TEAM" | "SYSTEM" | "INTERNAL" | string;
  actor: { type: "USER" | "SYSTEM" | "CUSTOMER" | string; memberId?: string | null; name?: string | null };
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
}

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type WorkingHours = Partial<Record<WeekdayKey, { start: string; end: string } | null>>;

export interface Team {
  id: string; name: string; leadMemberId?: string | null; status: TeamStatus; active: boolean;
  members: { id: string; displayName: string }[];
  /** null / missing = default hours. */
  workingHours?: WorkingHours | null;
}

/** Body of POST /jobs. */
export interface CreateJobInput {
  title: string;
  category: string;
  customerId: string;
  locationId: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  description?: string;
  requestedDate?: string;
  estimatedDurationMin?: number;
  requiredSkillIds?: string[];
  requirements?: JobRequirements;
  checklist?: string[];
}

export type AttachmentCategory = "BEFORE" | "DURING" | "AFTER" | "CUSTOMER_PROVIDED" | "INTERNAL";
export interface Attachment {
  id: string; jobId: string; category: AttachmentCategory; name: string; mime: string; sizeBytes: number;
  uploadedByMemberId: string; createdAt: string; url: string; urlExpiresAt: string;
}

export interface NotificationItem {
  id: string | number; kind: string; title: string; body: string; jobId?: string | null; jobReference?: string | null;
  read: boolean; readAt?: string | null; createdAt: string;
}

export interface OrgEvent { id: string | number; type: string; entityId?: string; payload?: unknown; createdAt: string }

export type TechAction = "start-journey" | "arrived" | "start" | "block" | "resume" | "complete";
export interface MyJobs { range: { from: string; to: string }; serverTime: string; items: Job[] }
