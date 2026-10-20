import { isB2bError } from "@/b2b/api/client";

export interface ApiFieldIssue { key: string; message: string }
export interface SplitFieldErrors<K extends string> {
  /** API message per form field the form can show it under. */
  fields: Partial<Record<K, string>>;
  /** Keys the form has no input for: shown in a banner that names the field. */
  unknown: ApiFieldIssue[];
}

const EMPTY = { fields: {}, unknown: [] };

/**
 * Every field problem of a failed 4xx save: each key of `fields` (VALIDATION_ERROR and other 400/409/422 shapes; "teamIds.0" -> "teamIds")
 * plus `body.field` of duplicate / invalid-reference errors. `aliases` maps an API key to the form key ("email" -> "workEmail").
 * The form-level key "_" (cross-field refinements) is left to the caller's banner.
 */
export function splitApiFieldErrors<K extends string>(err: unknown, known: readonly K[], aliases: Readonly<Record<string, K>> = {}): SplitFieldErrors<K> {
  if (!isB2bError(err) || err.status < 400 || err.status >= 500) return EMPTY;
  const fields: Partial<Record<K, string>> = {};
  const unknown: ApiFieldIssue[] = [];
  const put = (path: string, message: unknown) => {
    if (typeof message !== "string" || !message) return;
    const head = path.split(".")[0];
    if (!head || head === "_") return;
    const key = (aliases[path] ?? aliases[head] ?? ((known as readonly string[]).includes(head) ? head : null)) as K | null;
    if (key) { fields[key] ??= message; return; }
    if (!unknown.some((u) => u.key === head)) unknown.push({ key: head, message });
  };
  const raw = err.body.fields;
  if (raw && typeof raw === "object") for (const [path, msg] of Object.entries(raw as Record<string, unknown>)) put(path, msg);
  if (typeof err.body.field === "string") put(err.body.field, err.message);
  return { fields, unknown };
}
