import type { JobType, JobTypeInput } from "@/b2b/api/jobTypes";
import { parseMoney } from "@/b2b/lib/money";

// Pure helpers of the job types admin (ce3173a7).

export const NAME_MAX = 100;
/** 14 days, the same ceiling as a job's estimated duration. */
export const DURATION_MAX = 60 * 24 * 14;

export interface JobTypeForm { name: string; durationMin: string; price: string }
export type JobTypeFilter = "active" | "archived" | "all";
export type JobTypeErrors = Partial<Record<keyof JobTypeForm, "required" | "tooLong" | "invalid" | "range">>;
interface Opts { finance: boolean; locale: string; /** Digits of the price: the company's currency, or the one picked while it has none. */ currency?: string | null; /** The company has no currency yet: send this one with the first price. */ chooseCurrency?: string | null }

/** Spaces collapsed and trimmed, like the API stores it. */
export const normalizeName = (name: string): string => name.replace(/\s+/g, " ").trim();

/** Names are unique per company, case-insensitively, archived types included. */
export function isDuplicateName(types: readonly JobType[], name: string, exceptId: string | undefined): boolean {
  const n = normalizeName(name).toLowerCase();
  return !!n && types.some((x) => x.id !== exceptId && normalizeName(x.name).toLowerCase() === n);
}

export function validateJobTypeForm(f: JobTypeForm, o: Opts): JobTypeErrors {
  const e: JobTypeErrors = {};
  const name = normalizeName(f.name);
  if (!name) e.name = "required"; else if (name.length > NAME_MAX) e.name = "tooLong";
  const d = f.durationMin.trim();
  if (d) {
    if (!/^\d+$/.test(d)) e.durationMin = "invalid";
    else if (Number(d) < 1 || Number(d) > DURATION_MAX) e.durationMin = "range";
  }
  if (o.finance) {
    const r = parseMoney(f.price, o.locale, o.currency);
    if (!r.ok) e.price = r.reason === "range" ? "range" : "invalid";
  }
  return e;
}

/** POST body, or (with `original`) a PATCH body holding only what changed; an emptied optional field is cleared with null. */
export function jobTypeBody(f: JobTypeForm, o: Opts, original?: JobType): JobTypeInput {
  const name = normalizeName(f.name);
  const d = f.durationMin.trim();
  const duration = d ? Number(d) : null;
  const price = o.finance ? (() => { const r = parseMoney(f.price, o.locale, o.currency); return r.ok ? r.minor : null; })() : undefined;
  if (!original) {
    return { name, ...(duration !== null ? { defaultDurationMin: duration } : {}), ...(price !== undefined && price !== null ? { defaultPrice: price, ...(o.chooseCurrency ? { currency: o.chooseCurrency } : {}) } : {}) };
  }
  const patch: JobTypeInput = {};
  if (name !== original.name) patch.name = name;
  if (duration !== (original.defaultDurationMin ?? null)) patch.defaultDurationMin = duration;
  if (price !== undefined && price !== (original.defaultPrice ?? null)) {
    patch.defaultPrice = price;
    if (price !== null && o.chooseCurrency) patch.currency = o.chooseCurrency;
  }
  return patch;
}

export interface Moved { list: JobType[]; /** 1-based position of the moved type in the new order. */ position: number }

/** One step up/down (`delta` ±1), or an exact slot (`toIndex`, 0-based) for drag and drop. null = nothing to do. */
export function moveType(list: readonly JobType[], id: string, delta: number, toIndex?: number): Moved | null {
  const from = list.findIndex((x) => x.id === id);
  if (from < 0) return null;
  const to = toIndex !== undefined ? toIndex : from + delta;
  if (to < 0 || to >= list.length || to === from) return null;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return { list: next, position: to + 1 };
}

/** The server's rule for PUT /job-types/order: the given ids first, every other type after them in its old order. */
export function applyOrder(list: readonly JobType[], ids: readonly string[]): JobType[] {
  const byId = new Map(list.map((x) => [x.id, x]));
  const first = ids.map((id) => byId.get(id)).filter((x): x is JobType => !!x);
  const used = new Set(first.map((x) => x.id));
  return [...first, ...list.filter((x) => !used.has(x.id))];
}

export function filterTypes(list: readonly JobType[], filter: JobTypeFilter): JobType[] {
  return list.filter((x) => (filter === "all" ? true : filter === "archived" ? x.archived : !x.archived));
}
