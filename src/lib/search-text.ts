import { CATEGORIES } from "@/data/categories";
import labels from "@/data/category-labels.generated.json";

const LABELS = labels as Record<string, Record<string, string>>;

// Shortest query worth expanding into categories; a single letter would match
// almost every category name and swamp the results.
const MIN_CATEGORY_QUERY_LENGTH = 3;

/** Lowercases and strips diacritics so "Électricité" and "electricite" compare equal. */
export function foldText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Every category label, folded, in every supported locale — searching
 * shouldn't depend on which language the UI happens to be in.
 */
const CATEGORY_SEARCH_LABELS: ReadonlyArray<{ id: string; labels: readonly string[] }> = CATEGORIES.map(
  (category) => ({
    id: category.id,
    labels: [category.id, ...Object.values(LABELS[category.nameKey] ?? {})].map(foldText),
  })
);

/**
 * Category ids whose name, in any locale, contains every word of the query
 * (case/accent-insensitive, partial words allowed): "fontanero", "plomb" and
 * "Plumbing" all resolve to "plumbing".
 */
export function matchCategoryIds(query: string): string[] {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (words.join("").length < MIN_CATEGORY_QUERY_LENGTH) return [];
  return CATEGORY_SEARCH_LABELS.filter(({ labels }) =>
    labels.some((label) => words.every((word) => label.includes(word)))
  ).map(({ id }) => id);
}
