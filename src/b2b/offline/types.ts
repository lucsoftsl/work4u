import type { PauseReason, TechAction } from "@/b2b/api/types";
import type { ActionBody, PartInput } from "@/b2b/api/endpoints";

export type QueueKind = "action" | "checklist" | "photo" | "signature" | "pause" | "resume-work" | "undo" | "part";
export type PartOp = "add" | "edit" | "delete";
/** waiting: will be sent · sending: in flight · failed: needs the technician (retry/discard) · conflict: job changed, kept as a draft */
export type QueueStatus = "waiting" | "sending" | "failed" | "conflict";

export interface QueueItem {
  id: string;
  orgId: string;
  jobId: string;
  jobRef?: string;
  kind: QueueKind;
  status: QueueStatus;
  /** Also the `clientOccurredAt` sent with actions (when the technician really did it). */
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  /** Plain-language reason shown on the Sync tab. */
  error?: string;
  /** Persisted so a retry after a lost response replays the SAME request. */
  idempotencyKey: string;
  label: string;
  // kind === "action"
  action?: TechAction;
  body?: ActionBody;
  expectedVersion?: number;
  // kind === "checklist"
  itemId?: string;
  done?: boolean;
  // kind === "pause"
  pauseReason?: PauseReason;
  pauseNote?: string;
  // kind === "undo": the server's undo id when known (older actions are never undone by mistake)
  undoId?: number;
  // kind === "part": client-generated id so a part can be edited/removed before it ever synced
  partOp?: PartOp;
  partId?: string;
  part?: Partial<PartInput> & { name?: string };
  // kind === "photo" | "signature"
  file?: Blob;
  fileName?: string;
}

export interface FlushResult {
  sent: number;
  /** Stopped because the network (or server) isn't reachable: try again later. */
  offline: boolean;
  conflicts: number;
  failed: number;
  remaining: number;
  /** Undo requests the server refused (job changed / window over): dropped, the UI tells the technician. */
  undoRejected: number;
}

export type Verdict = { kind: "retry" | "conflict" | "failed"; message: string };
