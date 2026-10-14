// Category names in every locale, extracted from the locale JSON files into one small file.
// Search ("fontanero" finds plumbing while the UI is English) needs them synchronously, but the app only loads the
// active locale's full dictionary: this is the part of the other four that is always bundled (about 3 KB, not 650 KB).
export const LOCALES = ["en", "fr", "es", "hu", "ro"];

export function buildCategoryLabels(dicts) {
  const keys = Object.keys(dicts.en ?? {}).filter((k) => k.startsWith("categories.")).sort();
  return Object.fromEntries(keys.map((key) => [key, Object.fromEntries(LOCALES.map((l) => [l, dicts[l]?.[key] ?? dicts.en[key]]))]));
}
