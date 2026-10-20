import { fallback } from "./plural";
import type { CreateJobInput, JobRequirements, JobWorkspace } from "@/b2b/api/types";
import { moneyToInput, parseMoney } from "./money";

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

export const CATEGORY_SUGGESTIONS = [fallback("Repair"), fallback("Maintenance"), fallback("Installation"), fallback("Inspection")] as const;

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
  /** Job type (ce3173a7); "" = none. Replaces the free-text category once the company has job types. */
  jobTypeId: string;
  /** Money as typed (major units); only used with finance.view. */
  price: string;
  cost: string;
  /** Once the user edits duration / price, a job type no longer overwrites them. */
  durationTouched: boolean;
  priceTouched: boolean;
}

export const emptyDraft = (): JobDraft => ({
  title: "", category: "", description: "", customerId: "", locationId: "", priority: "NORMAL", requestedDate: "", durationMin: "",
  requiredSkillIds: [], requirements: { checklist: false, notes: false, photo: false, signature: false, review: false }, checklistText: "",
  jobTypeId: "", price: "", cost: "", durationTouched: false, priceTouched: false,
});

/** What the viewer's company and role change about the form. */
export interface FormOpts {
  /** The company has at least one active job type: the picker replaces the category field. */
  typesAvailable?: boolean;
  /** finance.view: price and cost exist for this viewer. Without it the keys are never read or sent. */
  finance?: boolean;
  locale?: string;
  /** Currency whose digits the amounts are typed in (the company's, or the one picked while the company has none). */
  currency?: string | null;
  /** The company has not chosen a currency: send this one with the first amount (the API then makes it the company's). */
  chooseCurrency?: string | null;
}

export type FieldKey =
  | "title" | "jobTypeId" | "category" | "description" | "customerId" | "locationId" | "priority" | "requestedDate" | "estimatedDurationMin"
  | "price" | "cost" | "requiredSkillIds" | "requirements" | "checklist";
/** Display order, used to focus the first invalid field. */
export const FIELD_ORDER: readonly FieldKey[] = [
  "title", "jobTypeId", "category", "description", "customerId", "locationId", "priority", "requestedDate", "estimatedDurationMin", "price", "cost", "requiredSkillIds", "requirements", "checklist",
];

export type FieldCode = "required" | "tooLong" | "invalidDate" | "invalidNumber" | "outOfRange" | "tooMany" | "invalidMoney" | "moneyRange";
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

export function validateDraft(d: JobDraft, opts: FormOpts = {}): DraftErrors {
  const e: DraftErrors = {};
  const title = d.title.trim();
  if (!title) e.title = "required"; else if (title.length > LIMITS.title) e.title = "tooLong";
  const category = d.category.trim();
  if (opts.typesAvailable) {
    if (!d.jobTypeId) e.jobTypeId = "required";
  } else if (!d.jobTypeId) {
    if (!category) e.category = "required"; else if (category.length > LIMITS.category) e.category = "tooLong";
  }
  if (d.description.trim().length > LIMITS.description) e.description = "tooLong";
  if (!d.customerId) e.customerId = "required";
  if (!d.locationId) e.locationId = "required";
  if (d.requestedDate && !isRealDate(d.requestedDate)) e.requestedDate = "invalidDate";
  if (d.durationMin.trim()) {
    const n = parseDuration(d.durationMin);
    if (n === null) e.estimatedDurationMin = "invalidNumber";
    else if (n < 1 || n > LIMITS.durationMax) e.estimatedDurationMin = "outOfRange";
  }
  if (opts.finance) {
    for (const k of ["price", "cost"] as const) {
      const r = parseMoney(d[k], opts.locale, opts.currency);
      if (!r.ok) e[k] = r.reason === "range" ? "moneyRange" : "invalidMoney";
    }
  }
  if (d.requiredSkillIds.length > LIMITS.skills) e.requiredSkillIds = "tooMany";
  const items = parseChecklist(d.checklistText);
  if (items.length > LIMITS.checklistItems) e.checklist = "tooMany";
  else if (items.some((i) => i.length > LIMITS.checklistItem)) e.checklist = "tooLong";
  return e;
}

export const firstInvalid = (errors: DraftErrors): FieldKey | null => FIELD_ORDER.find((k) => errors[k]) ?? null;

/** Minor units of a typed amount, or undefined when empty / unreadable / hidden from this viewer. */
function minor(text: string, opts: FormOpts): number | undefined {
  if (!opts.finance) return undefined;
  const r = parseMoney(text, opts.locale, opts.currency);
  return r.ok && r.minor !== null ? r.minor : undefined;
}

/** The category goes on the wire only when the company has no job types (with types the API copies the type's name). */
function categoryOf(d: JobDraft, opts: FormOpts): string | undefined {
  const c = d.category.trim();
  return c && !opts.typesAvailable ? c : undefined;
}

/** POST /jobs body. Optional values are omitted rather than sent empty. */
export function buildCreateJobInput(d: JobDraft, opts: FormOpts = {}): CreateJobInput {
  const duration = parseDuration(d.durationMin);
  const items = parseChecklist(d.checklistText);
  const description = d.description.trim();
  const category = categoryOf(d, opts);
  const price = minor(d.price, opts);
  const cost = minor(d.cost, opts);
  return {
    title: d.title.trim(),
    ...(category ? { category } : {}),
    ...(d.jobTypeId ? { jobTypeId: d.jobTypeId } : {}),
    customerId: d.customerId,
    locationId: d.locationId,
    priority: d.priority,
    ...(description ? { description } : {}),
    ...(d.requestedDate ? { requestedDate: d.requestedDate } : {}),
    ...(duration !== null ? { estimatedDurationMin: duration } : {}),
    ...(price !== undefined ? { price } : {}),
    ...(cost !== undefined ? { cost } : {}),
    ...(opts.chooseCurrency && (price !== undefined || cost !== undefined) ? { currency: opts.chooseCurrency } : {}),
    ...(d.requiredSkillIds.length ? { requiredSkillIds: [...d.requiredSkillIds] } : {}),
    requirements: { ...d.requirements },
    ...(items.length ? { checklist: items } : {}),
  };
}

// ---- drafts (4718e5f9)
/** A draft needs a title or a client; nothing else. */
export const draftNeedsTitleOrClient = (d: JobDraft): boolean => !d.title.trim() && !d.customerId;

/**
 * What can still block saving a DRAFT: nothing is required, but a value that cannot be sent (a malformed date, number or amount,
 * text over the limit) is still refused. Everything "required" is dropped from the full validation.
 */
export function draftErrors(d: JobDraft, opts: FormOpts = {}): DraftErrors {
  return Object.fromEntries(Object.entries(validateDraft(d, opts)).filter(([, code]) => code !== "required")) as DraftErrors;
}

/** POST /jobs {draft:true}: whatever is filled in. A location needs its client. */
export function buildDraftBody(d: JobDraft, opts: FormOpts = {}): CreateJobInput {
  const full = buildCreateJobInput(d, opts);
  const { title, customerId, locationId, ...rest } = full;
  return {
    draft: true,
    ...(title ? { title } : {}),
    ...(customerId ? { customerId } : {}),
    ...(customerId && locationId ? { locationId } : {}),
    ...rest,
  };
}

/** PATCH /jobs/:id on a draft: the whole form; optional fields are cleared with null, a blank title is sent as "". */
export function buildDraftPatch(d: JobDraft, opts: FormOpts = {}): Record<string, unknown> {
  const duration = parseDuration(d.durationMin);
  const items = parseChecklist(d.checklistText);
  const title = d.title.trim();
  const category = categoryOf(d, opts);
  const patch: Record<string, unknown> = {
    title, // "" is accepted on a draft (a draft with only a client); promotion still requires one
    ...(category ? { category } : {}),
    jobTypeId: d.jobTypeId || null,
    description: d.description.trim() || null,
    ...(d.customerId ? { customerId: d.customerId } : {}),
    ...(d.customerId && d.locationId ? { locationId: d.locationId } : {}),
    priority: d.priority,
    requestedDate: d.requestedDate || null,
    estimatedDurationMin: duration,
    requiredSkillIds: [...d.requiredSkillIds],
    requirements: { ...d.requirements },
    checklist: items,
  };
  if (opts.finance) {
    const price = minor(d.price, opts);
    const cost = minor(d.cost, opts);
    patch.price = price ?? null;
    patch.cost = cost ?? null;
    if (opts.chooseCurrency && (price !== undefined || cost !== undefined)) patch.currency = opts.chooseCurrency;
  }
  return patch;
}

export type MissingKey = "title" | "customer" | "location" | "type";
/** "Missing: client, location" hints of a draft, from what the list/detail already carries. */
export function draftMissing(j: { title?: string | null; customerId?: string | null; locationId?: string | null; category?: string | null; jobTypeId?: string | null }): MissingKey[] {
  const out: MissingKey[] = [];
  if (!j.title?.trim()) out.push("title");
  if (!j.customerId) out.push("customer");
  if (!j.locationId) out.push("location");
  if (!j.jobTypeId && !j.category?.trim()) out.push("type");
  return out;
}

/** 422 DRAFT_INCOMPLETE `missing[]` (API field names) -> the form fields to highlight. */
export function mapMissing(missing: readonly string[], typesAvailable: boolean): FieldKey[] {
  const out: FieldKey[] = [];
  for (const m of missing) {
    const key: FieldKey | null = m === "title" ? "title" : m === "customerId" ? "customerId" : m === "locationId" ? "locationId" : m === "category" ? (typesAvailable ? "jobTypeId" : "category") : null;
    if (key && !out.includes(key)) out.push(key);
  }
  return out;
}

export interface JobTypeDefaults { id: string; defaultDurationMin: number | null; defaultPrice?: number | null }

/**
 * Choose (or clear, with null) the job type. Its default duration and price prefill what the user has not edited;
 * picking the type that is already chosen changes nothing, so edits survive. Price is only ever filled for finance viewers.
 */
export function applyJobType(d: JobDraft, type: JobTypeDefaults | null, opts: FormOpts = {}): JobDraft {
  if (!type) return d.jobTypeId ? { ...d, jobTypeId: "" } : d;
  if (d.jobTypeId === type.id) return d;
  const next: JobDraft = { ...d, jobTypeId: type.id };
  if (!d.durationTouched && type.defaultDurationMin) next.durationMin = String(type.defaultDurationMin);
  if (opts.finance && !d.priceTouched && typeof type.defaultPrice === "number") next.price = moneyToInput(type.defaultPrice, opts.locale ?? "en", opts.currency);
  return next;
}

/** Form state of an existing draft (the editor). Missing client/location/money keys become blank. */
export function draftFromJob(job: JobWorkspace, opts: FormOpts = {}): JobDraft {
  const locale = opts.locale ?? "en";
  const hasPrice = opts.finance && typeof job.price === "number";
  return {
    title: job.title ?? "",
    category: job.category ?? "",
    description: job.description ?? "",
    customerId: job.customerId ?? "",
    locationId: job.locationId ?? "",
    priority: (["LOW", "NORMAL", "HIGH", "URGENT"].includes(String(job.priority)) ? job.priority : "NORMAL") as NewJobPriority,
    requestedDate: job.requestedDate ?? "",
    durationMin: job.estimatedDurationMin ? String(job.estimatedDurationMin) : "",
    requiredSkillIds: (job.requiredSkills ?? []).map((x) => x.id),
    requirements: { ...emptyDraft().requirements, ...(job.requirements ?? {}) },
    checklistText: (job.checklist ?? []).map((i) => i.text).join("\n"),
    jobTypeId: job.jobTypeId ?? "",
    price: opts.finance ? moneyToInput(job.price, locale, opts.currency ?? job.currency) : "",
    cost: opts.finance ? moneyToInput(job.cost, locale, opts.currency ?? job.currency) : "",
    durationTouched: !!job.estimatedDurationMin,
    priceTouched: !!hasPrice,
  };
}

/** 90 -> "1 h 30 min", 120 -> "2 h", 45 -> "45 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} h` : "", m || !h ? `${m} min` : ""].filter(Boolean).join(" ");
}

// ---- server errors
export type SubmitErrorKind = "field" | "forbidden" | "network" | "archived" | "generic" | "incomplete" | "isDraft" | "notDraft" | "archivedType" | "currency" | "currencyRequired" | "currencyMismatch";
export interface SubmitError {
  kind: SubmitErrorKind;
  /** Server message per form field (VALIDATION_ERROR / INVALID_REFERENCE). */
  fields: Partial<Record<FieldKey, string>>;
  /** Shown above the form when no field can carry the message. */
  message?: string;
  /** DRAFT_INCOMPLETE: the fields to highlight (each shows "required"). */
  missing?: FieldKey[];
  /** API field keys the form has no input for, named ("scheduledEnd: …"), shown even when other fields are marked. */
  unknown?: string;
  /** CURRENCY_REQUIRED: what to pre-select when asking for the company currency. */
  suggestedCurrency?: string;
  /** CURRENCY_MISMATCH: the company's currency (the page showed another). */
  companyCurrency?: string;
}

const FIELD_KEYS = new Set<string>(FIELD_ORDER);
/** "checklist.3" -> "checklist", "requirements.photo" -> "requirements"; unknown keys -> null. */
export function normalizeFieldKey(path: string): FieldKey | null {
  if (path === "estimatedDurationMin" || FIELD_KEYS.has(path)) return path as FieldKey;
  const head = path.split(".")[0];
  return FIELD_KEYS.has(head) ? (head as FieldKey) : null;
}

/** A string from the error body, flat or under `details`. */
const detail = (body: Record<string, unknown> | undefined, key: string): string | undefined => {
  const v = body?.[key] ?? (body?.details as Record<string, unknown> | undefined)?.[key];
  return typeof v === "string" && v ? v : undefined;
};

interface ErrorLike { status?: number; code?: string; message?: string; body?: Record<string, unknown> }

export function mapSubmitError(err: unknown, opts: FormOpts = {}): SubmitError {
  const e = (err ?? {}) as ErrorLike;
  const message = typeof e.message === "string" && e.message ? e.message : undefined;
  if (e.code === "CURRENCY_REQUIRED") return { kind: "currencyRequired", fields: {}, message, suggestedCurrency: detail(e.body, "effectiveCurrency") };
  if (e.code === "CURRENCY_MISMATCH") return { kind: "currencyMismatch", fields: {}, message, companyCurrency: detail(e.body, "currency") };
  if (e.code === "NETWORK") return { kind: "network", fields: {}, message };
  if (e.code === "CUSTOMER_ARCHIVED") return { kind: "archived", fields: {} };
  if (e.code === "DRAFT_INCOMPLETE") {
    const raw = e.body?.missing ?? (e.body?.details as { missing?: unknown } | undefined)?.missing;
    return { kind: "incomplete", fields: {}, missing: mapMissing(Array.isArray(raw) ? (raw as string[]) : [], !!opts.typesAvailable) };
  }
  if (e.code === "JOB_IS_DRAFT") return { kind: "isDraft", fields: {} };
  if (e.code === "NOT_A_DRAFT") return { kind: "notDraft", fields: {} };
  if (e.code === "JOB_TYPE_ARCHIVED") return { kind: "archivedType", fields: { jobTypeId: message ?? "This job type is archived" } };
  if (e.status === 403) return { kind: "forbidden", fields: {} };
  if (e.code === "VALIDATION_ERROR") {
    const fields: SubmitError["fields"] = {};
    const loose: string[] = [];
    const raw = e.body?.fields;
    if (raw && typeof raw === "object") {
      for (const [path, msg] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof msg !== "string") continue;
        const key = normalizeFieldKey(path);
        if (key) fields[key] ??= msg;
        else loose.push(path === "_" ? msg : `${path.split(".")[0]}: ${msg}`);
      }
    }
    const unknown = loose.length ? loose.join(" ") : undefined;
    return { kind: "field", fields, message: Object.keys(fields).length || unknown ? undefined : message, ...(unknown ? { unknown } : {}) };
  }
  if (e.code === "INVALID_REFERENCE") {
    const key = typeof e.body?.field === "string" ? normalizeFieldKey(e.body.field) : null;
    return key ? { kind: "field", fields: { [key]: message ?? "Invalid reference" } } : { kind: "field", fields: {}, message };
  }
  return { kind: "generic", fields: {}, message };
}
