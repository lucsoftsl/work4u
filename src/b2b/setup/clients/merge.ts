import type { DuplicateGroup, MergeResult } from "@/b2b/setup/api";

export const MAX_MERGE_SOURCES = 10;

export interface MergeTotals { jobs: number; contacts: number; notes: number; locations: number; tags: number }

export function mergeTotals(result: Pick<MergeResult, "merges">): MergeTotals {
  return result.merges.reduce<MergeTotals>(
    (acc, m) => ({
      jobs: acc.jobs + m.moved.jobs, contacts: acc.contacts + m.moved.contacts, notes: acc.notes + m.moved.notes,
      locations: acc.locations + m.moved.locations, tags: acc.tags + m.moved.tags,
    }),
    { jobs: 0, contacts: 0, notes: 0, locations: 0, tags: 0 }
  );
}

export const mergeIds = (result: Pick<MergeResult, "merges">): string[] => result.merges.map((m) => m.mergeId);

/** Everything except the kept client, in group order; at most 10 per POST. */
export function sourceIdsFor(group: Pick<DuplicateGroup, "customers">, keepId: string): string[] {
  return group.customers.filter((c) => c.id !== keepId).map((c) => c.id);
}

export const canMergeGroup = (group: Pick<DuplicateGroup, "customers">, keepId: string): boolean => {
  const n = sourceIdsFor(group, keepId).length;
  return group.customers.some((c) => c.id === keepId) && n >= 1 && n <= MAX_MERGE_SOURCES;
};

/** Stable id for a group (?group=, React keys): the API's opaque `id`; `reason:key` only for an older API without ids (keys are masked and not unique). */
export const groupId = (g: Pick<DuplicateGroup, "id" | "reason" | "key">): string => g.id ?? `${g.reason}:${g.key}`;
export const findGroup = (groups: readonly DuplicateGroup[], id: string | null | undefined): DuplicateGroup | undefined =>
  id ? groups.find((g) => groupId(g) === id) : undefined;

/** Which merge-failure message to show: the two documented codes get the "nothing changed" copy. */
export function isMergeRefusal(code: string | undefined): boolean {
  return code === "MERGE_INVALID" || code === "CUSTOMER_ARCHIVED";
}

/** Duplicate cards show who might be the same client without exposing the whole number: "+34 ••• ••• 021". */
export function maskPhone(phone: string | null | undefined): string | null {
  const v = (phone ?? "").replace(/[\s().-]/g, "");
  if (!v) return null;
  if (v.length <= 4) return "•••";
  const prefix = v.startsWith("+") ? `${v.slice(0, 3)} ` : "";
  return `${prefix}••• ••• ${v.slice(-3)}`;
}

/** "a•••@example.com": enough to recognise a duplicate without showing the whole address. */
export function maskEmail(email: string | null | undefined): string | null {
  const v = (email ?? "").trim();
  if (!v) return null;
  const at = v.lastIndexOf("@");
  if (at <= 0) return "•••";
  return `${v[0]}•••${v.slice(at)}`;
}
