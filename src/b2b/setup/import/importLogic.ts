import { isB2bError } from "@/b2b/api/client";
import type { ImportAction, ImportCounts, ImportOptions, ImportPreview, ImportRow, ImportStatus } from "../api";

export type Kind = "employees" | "customers";
export const ENCODINGS = ["utf-8", "windows-1252", "windows-1250", "iso-8859-2"] as const;
export const TYPED_CONFIRM_THRESHOLD = 500;
export const POLL_MS = 2_000;
export const POLL_HIDDEN_MS = 10_000;
export const PREVIEW_ROWS_SHOWN = 200;

export type FileErrorCode =
  | "UNSUPPORTED_FILE_TYPE" | "ENCODING_NOT_UTF8" | "TOO_MANY_ROWS" | "TOO_MANY_COLUMNS" | "TOO_LARGE" | "EMPTY_FILE"
  | "NO_HEADER" | "UNTERMINATED_QUOTE" | "FIELD_TOO_LONG" | "MISSING_COLUMNS";

export type FileError =
  | { kind: "file"; code: FileErrorCode }
  | { kind: "missing"; missing: string[]; headers: string[]; knownFields: string[] }
  | { kind: "other"; error: unknown };

const FILE_CODES: readonly string[] = ["UNSUPPORTED_FILE_TYPE", "ENCODING_NOT_UTF8", "TOO_MANY_ROWS", "TOO_MANY_COLUMNS", "TOO_LARGE", "EMPTY_FILE", "NO_HEADER", "UNTERMINATED_QUOTE", "FIELD_TOO_LONG"];
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Maps an upload failure to a file-level error (design §5). Falls back to HTTP status when csvCode is absent. */
export function classifyUploadError(err: unknown): FileError {
  if (!isB2bError(err)) return { kind: "other", error: err };
  const details = (err.body.details && typeof err.body.details === "object" ? err.body.details : {}) as Record<string, unknown>;
  const csvCode = typeof details.csvCode === "string" ? details.csvCode : typeof err.body.csvCode === "string" ? err.body.csvCode : "";
  if (csvCode === "MISSING_COLUMNS" || (err.status === 422 && err.code === "IMPORT_FILE_INVALID" && !csvCode)) {
    const src = { ...err.body, ...details };
    return { kind: "missing", missing: strArr(src.missing), headers: strArr(src.headers), knownFields: strArr(src.knownFields) };
  }
  if (FILE_CODES.includes(csvCode)) return { kind: "file", code: csvCode as FileErrorCode };
  if (err.code === "IMPORT_FILE_INVALID" || err.code === "UNSUPPORTED_FILE_TYPE") {
    if (err.status === 415 || err.code === "UNSUPPORTED_FILE_TYPE") return { kind: "file", code: "UNSUPPORTED_FILE_TYPE" };
    if (err.status === 413) return { kind: "file", code: "TOO_LARGE" };
  }
  return { kind: "other", error: err };
}

export interface OptionsState {
  kind: Kind; createMissingTeams: boolean; createMissingSkills: boolean; clearEmpty: boolean; matchByName: boolean;
  defaultCountry: string; encoding: string; mapping: Record<string, string>;
}

export const initialOptionsState = (kind: Kind, country = ""): OptionsState => ({
  kind, createMissingTeams: false, createMissingSkills: false, clearEmpty: false, matchByName: false,
  defaultCountry: country.toUpperCase(), encoding: "", mapping: {},
});

/** Only known option keys are sent; kind-specific keys are dropped for the other kind. */
export function buildImportOptions(s: OptionsState): ImportOptions {
  const o: ImportOptions = {};
  if (/^[A-Za-z]{2}$/.test(s.defaultCountry)) o.defaultCountry = s.defaultCountry.toUpperCase();
  if (s.clearEmpty) o.clearEmpty = true;
  if (s.kind === "employees") {
    if (s.createMissingTeams) o.createMissingTeams = true;
    if (s.createMissingSkills) o.createMissingSkills = true;
  } else if (s.matchByName) o.matchByName = true;
  if ((ENCODINGS as readonly string[]).includes(s.encoding)) o.encoding = s.encoding as ImportOptions["encoding"];
  const mapping = Object.fromEntries(Object.entries(s.mapping).filter(([, h]) => h !== ""));
  if (Object.keys(mapping).length > 0) o.mapping = mapping;
  return o;
}

export type MapStatus = "matched" | "needs" | "skipped";
export interface MapRow { header: string; field: string; status: MapStatus }

/**
 * Rows of the mapping table, one per file header. `used` is field -> header (as returned by the API).
 * A header with no field is "skipped"; a required field in `missing` with no header makes its row set "needs".
 */
export function buildMapRows(headers: readonly string[], used: Record<string, string>, missing: readonly string[] = []): MapRow[] {
  const fieldByHeader = new Map(Object.entries(used).map(([f, h]) => [h, f] as const));
  return headers.map((header): MapRow => {
    const field = fieldByHeader.get(header) ?? "";
    const status: MapStatus = field ? "matched" : missing.length > 0 ? "needs" : "skipped";
    return { header, field, status };
  });
}

/** Applies a user choice (header -> field) to a field -> header mapping, removing any previous use of the header or field. */
export function setHeaderField(mapping: Record<string, string>, header: string, field: string): Record<string, string> {
  const next = Object.fromEntries(Object.entries(mapping).filter(([f, h]) => h !== header && f !== field));
  if (field) next[field] = header;
  return next;
}

export function actionable(c: Pick<ImportCounts, "create" | "update">): number { return c.create + c.update; }
export const needsTypedConfirm = (n: number): boolean => n > TYPED_CONFIRM_THRESHOLD;
export const confirmWord = (kind: Kind, tr: (k: string, f: string) => string): string => kind === "employees" ? tr("b2b.import.confirmWord.employees", "IMPORT") : tr("b2b.import.confirmWord.customers", "IMPORT");
export const isConfirmTyped = (typed: string, word: string): boolean => typed.trim().toLowerCase() === word.trim().toLowerCase() && word.trim() !== "";

/** Error rows first (stable), capped at 200, optional errors-only filter. */
export function sortPreviewRows(rows: readonly ImportRow[], errorsOnly = false, cap = PREVIEW_ROWS_SHOWN): ImportRow[] {
  const err = rows.filter((r) => r.action === "ERROR");
  const rest = errorsOnly ? [] : rows.filter((r) => r.action !== "ERROR");
  return [...err, ...rest].slice(0, cap);
}

export type CommitMode = "skip" | "all" | "blocked";
/** skip => has error rows and some valid ones; blocked => nothing valid. */
export function commitMode(c: ImportCounts): CommitMode {
  if (actionable(c) === 0) return "blocked";
  return c.error > 0 ? "skip" : "all";
}

export const isTerminal = (status: string): boolean => status === "DONE" || status === "FAILED" || status === "DISCARDED";

/** Next poll delay in ms, or null to stop. Backs off while the tab is hidden. */
export function nextPollDelay(status: ImportStatus | string, hidden: boolean): number | null {
  if (status !== "COMMITTING") return null;
  return hidden ? POLL_HIDDEN_MS : POLL_MS;
}

export function progressPercent(done: number, total: number): number {
  return total <= 0 ? 0 : Math.min(100, Math.round((done / total) * 100));
}

/** listImportRows answers an array, {items} or {rows}. */
export function unwrapRows(res: Awaited<ReturnType<typeof import("../api").listImportRows>>): ImportRow[] {
  return Array.isArray(res) ? res : res.items ?? res.rows ?? [];
}

export const ACTIONS: readonly ImportAction[] = ["CREATE", "UPDATE", "SKIP", "ERROR"];

/** A short key=value summary of a row's normalised values, for the key-values column. */
export function rowKeyValues(values: Record<string, unknown> | null, max = 3): string {
  if (!values) return "";
  return Object.entries(values)
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object")
    .slice(0, max)
    .map(([, v]) => String(v))
    .join(" · ");
}

export const previewIsStale = (p: ImportPreview | undefined): boolean => !p || p.status === "DISCARDED";
