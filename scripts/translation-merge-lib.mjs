// Merge of the translations DB into the bundled locale JSON files.
// Rule: DB values override existing keys; keys that exist only locally (new in code, not yet pushed to the DB) are NEVER removed;
// a blank DB value never overwrites a real local string.
const sortKeys = (obj) => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));

export function mergeTranslations(local, db) {
  const merged = { ...local };
  const added = [];
  const changed = [];
  const ignoredBlank = [];
  for (const [key, value] of Object.entries(db)) {
    if (typeof value !== "string") continue;
    const hasLocal = Object.prototype.hasOwnProperty.call(local, key);
    if (value.trim() === "" && hasLocal && String(local[key]).trim() !== "") {
      ignoredBlank.push(key);
      continue;
    }
    if (!hasLocal) added.push(key);
    else if (local[key] !== value) changed.push(key);
    merged[key] = value;
  }
  const localOnly = Object.keys(local).filter((k) => !Object.prototype.hasOwnProperty.call(db, k)).sort();
  return { merged: sortKeys(merged), added: added.sort(), changed: changed.sort(), ignoredBlank: ignoredBlank.sort(), localOnly };
}

export const LOCALES = ["en", "fr", "es", "hu", "ro"];

/** One-line summary plus the first few keys, for the build log. */
export function describeMerge(locale, r, previewCount = 8) {
  const head = `${locale}.json: +${r.added.length} added, ${r.changed.length} changed from DB, ${r.localOnly.length} local-only kept (not in DB), ${r.ignoredBlank.length} blank DB values ignored`;
  const lines = [];
  if (r.added.length) lines.push(`  added: ${r.added.slice(0, previewCount).join(", ")}${r.added.length > previewCount ? ", …" : ""}`);
  if (r.changed.length) lines.push(`  changed: ${r.changed.slice(0, previewCount).join(", ")}${r.changed.length > previewCount ? ", …" : ""}`);
  return [head, ...lines].join("\n");
}
