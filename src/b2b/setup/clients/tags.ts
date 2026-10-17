// Tag rules mirror the API (PUT /customers/:id/tags): lower-case, <= 20 tags, <= 40 chars, no leading = + - @.
export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 40;
const FORBIDDEN_LEAD = /^[=+\-@]/;

export type TagError = "tooLong" | "leadingChar" | "tooMany" | "duplicate";

export const normalizeTag = (raw: string): string => raw.trim().replace(/\s+/g, " ").toLowerCase();

export function checkTag(tag: string, existing: readonly string[]): TagError | null {
  if (tag.length > MAX_TAG_LENGTH) return "tooLong";
  if (FORBIDDEN_LEAD.test(tag)) return "leadingChar";
  if (existing.includes(tag)) return "duplicate";
  if (existing.length >= MAX_TAGS) return "tooMany";
  return null;
}

/** Returns a new list; an empty input is ignored (no error), an invalid one leaves the list unchanged. */
export function addTag(tags: readonly string[], raw: string): { tags: string[]; error: TagError | null } {
  const tag = normalizeTag(raw);
  if (!tag) return { tags: [...tags], error: null };
  const error = checkTag(tag, tags);
  return error ? { tags: [...tags], error } : { tags: [...tags, tag], error: null };
}

export const removeTag = (tags: readonly string[], tag: string): string[] => tags.filter((t) => t !== tag);
