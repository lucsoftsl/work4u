import type { CreateJobInput, JobRequirements } from "@/b2b/api/types";

// Create-job form: draft state, validation, request body, server-error mapping. Pure (no React, no network).
// Limits mirror the API's createJobSchema.

export const PRIORITY_OPTIONS = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type NewJobPriority = (typeof PRIORITY_OPTIONS)[number];

export const LIMITS = {
  title: 200, category: 100, description: 10_000, checklistItem: 500, checklistItems: 100, skills: 50,
  durationMax: 60 * 24 * 14,
} as const;

export const DURATION_PRESETS: ReadonlyArray<{ minutes: number; label: string }> = [
  { minutes: 30, label: "30 min" }, { minutes: 60, label: "1 h" }, { minutes: 120, label: "2 h" },
  { minutes: 240, label: "4 h" }, { minutes: 480, label: "8 h" },
];

export const CATEGORY_SUGGESTIONS = ["Repair", "Maintenance", "Installation", "Inspection"] as const;

export interface JobDraft {
  title: string;
  category: string;
  description: string;
  customerId: string;
  locationId: string;
  priority: NewJobPriority;
  requestedDate: string; // YYYY-MM-DD or ""
  durationMin: string; // digits or ""
  requiredSkillIds: string[];
  requirements: JobRequirements;
  checklistText: string; // one item per line
}

export const emptyDraft = (): JobDraft => ({
  title: "", category: "", description: "", customerId: "", locationId: "", priority: "NORMAL", requestedDate: "", durationMin: "",
  requiredSkillIds: [], requirements: { checklist: false, notes: false, photo: false, signature: false, review: false }, checklistText: "",
});

export type FieldKey = "title" | "category" | "description" | "customerId" | "locationId" | "priority" | "requestedDate" | "estimatedDurationMin" | "requiredSkillIds" | "requirements" | "checklist";
/** Display order, used to focus the first invalid field. */
export const FIELD_ORDER: readonly FieldKey[] = ["title", "category", "description", "customerId", "locationId", "priority", "requestedDate", "estimatedDurationMin", "requiredSkillIds", "requirements", "checklist"];

export type FieldCode = "required" | "tooLong" | "invalidDate" | "invalidNumber" | "outOfRange" | "tooMany";
export type DraftErrors = Partial<Record<FieldKey, FieldCode>>;

/** Non-empty trimmed lines. */
export const parseChecklist = (text: string): string[] => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

const isRealDate = (v: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
};

export function parseDuration(v: string): number | null {
  const s = v.trim();
  return /^\d+$/.test(s) ? Number(s) : null;
}

export function validateDraft(d: JobDraft): DraftErrors {
  const e: DraftErrors = {};
  const title = d.title.trim();
  if (!title) e.title = "required"; else if (title.length > LIMITS.title) e.title = "tooLong";
  const category = d.category.trim();
  if (!category) e.category = "required"; else if (category.length > LIMITS.category) e.category = "tooLong";
  if (d.description.trim().length > LIMITS.description) e.description = "tooLong";
  if (!d.customerId) e.customerId = "required";
  if (!d.locationId) e.locationId = "required";
  if (d.requestedDate && !isRealDate(d.requestedDate)) e.requestedDate = "invalidDate";
  if (d.durationMin.trim()) {
    const n = parseDuration(d.durationMin);
    if (n === null) e.estimatedDurationMin = "invalidNumber";
    else if (n < 1 || n > LIMITS.durationMax) e.estimatedDurationMin = "outOfRange";
  }
  if (d.requiredSkillIds.length > LIMITS.skills) e.requiredSkillIds = "tooMany";
  const items = parseChecklist(d.checklistText);
  if (items.length > LIMITS.checklistItems) e.checklist = "tooMany";
  else if (items.some((i) => i.length > LIMITS.checklistItem)) e.checklist = "tooLong";
  return e;
}

export const firstInvalid = (errors: DraftErrors): FieldKey | null => FIELD_ORDER.find((k) => errors[k]) ?? null;

/** POST /jobs body. Optional values are omitted rather than sent empty. */
export function buildCreateJobInput(d: JobDraft): CreateJobInput {
  const duration = parseDuration(d.durationMin);
  const items = parseChecklist(d.checklistText);
  const description = d.description.trim();
  return {
    title: d.title.trim(),
    category: d.category.trim(),
    customerId: d.customerId,
    locationId: d.locationId,
    priority: d.priority,
    ...(description ? { description } : {}),
    ...(d.requestedDate ? { requestedDate: d.requestedDate } : {}),
    ...(duration !== null ? { estimatedDurationMin: duration } : {}),
    ...(d.requiredSkillIds.length ? { requiredSkillIds: [...d.requiredSkillIds] } : {}),
    requirements: { ...d.requirements },
    ...(items.length ? { checklist: items } : {}),
  };
}

/** 90 -> "1 h 30 min", 120 -> "2 h", 45 -> "45 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} h` : "", m || !h ? `${m} min` : ""].filter(Boolean).join(" ");
}

// ---- server errors
export type SubmitErrorKind = "field" | "forbidden" | "network" | "generic";
export interface SubmitError {
  kind: SubmitErrorKind;
  /** Server message per form field (VALIDATION_ERROR / INVALID_REFERENCE). */
  fields: Partial<Record<FieldKey, string>>;
  /** Shown above the form when no field can carry the message. */
  message?: string;
}

const FIELD_KEYS = new Set<string>(FIELD_ORDER);
/** "checklist.3" -> "checklist", "requirements.photo" -> "requirements"; unknown keys -> null. */
export function normalizeFieldKey(path: string): FieldKey | null {
  if (path === "estimatedDurationMin" || FIELD_KEYS.has(path)) return path as FieldKey;
  const head = path.split(".")[0];
  return FIELD_KEYS.has(head) ? (head as FieldKey) : null;
}

interface ErrorLike { status?: number; code?: string; message?: string; body?: Record<string, unknown> }

export function mapSubmitError(err: unknown): SubmitError {
  const e = (err ?? {}) as ErrorLike;
  const message = typeof e.message === "string" && e.message ? e.message : undefined;
  if (e.code === "NETWORK") return { kind: "network", fields: {}, message };
  if (e.status === 403) return { kind: "forbidden", fields: {} };
  if (e.code === "VALIDATION_ERROR") {
    const fields: SubmitError["fields"] = {};
    let loose: string | undefined;
    const raw = e.body?.fields;
    if (raw && typeof raw === "object") {
      for (const [path, msg] of Object.entries(raw as Record<string, unknown>)) {
        const key = normalizeFieldKey(path);
        if (key && typeof msg === "string") fields[key] ??= msg;
        else if (typeof msg === "string") loose ??= msg;
      }
    }
    return { kind: "field", fields, message: Object.keys(fields).length ? undefined : (loose ?? message) };
  }
  if (e.code === "INVALID_REFERENCE") {
    const key = typeof e.body?.field === "string" ? normalizeFieldKey(e.body.field) : null;
    return key ? { kind: "field", fields: { [key]: message ?? "Invalid reference" } } : { kind: "field", fields: {}, message };
  }
  return { kind: "generic", fields: {}, message };
}
