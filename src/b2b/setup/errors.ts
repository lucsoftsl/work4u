import { isB2bError } from "@/b2b/api/client";
import { splitApiFieldErrors, type ApiFieldIssue } from "@/b2b/lib/apiFieldErrors";
import type { PluralText } from "./i18n";

type Tr = (key: string, fallback: string, vars?: Record<string, string | number>) => string;
type Trn = (base: string, text: PluralText, n: number, vars?: Record<string, string | number>) => string;

/** A plain-language message for a failed company-setup request. Never shows codes or "403"; says what to do. */
export function setupErrorMessage(err: unknown, tr: Tr): string {
  if (!isB2bError(err)) return tr("b2b.setup.err.generic", "Something went wrong. Try again in a moment.");
  switch (err.code) {
    case "ADMIN_ONLY": return tr("b2b.setup.err.adminOnly", "Only an Administrator can do that for an Administrator role.");
    case "DUPLICATE_MEMBER": return tr("b2b.setup.err.duplicate", "Another person already has this {field}.", { field: duplicateFieldLabel(err.body.field, tr) });
    case "MEMBER_ALREADY_CLAIMED": return tr("b2b.setup.err.claimed", "This person already joined with an invitation.");
    case "MEMBER_REMOVED": return tr("b2b.setup.err.removed", "This person was removed from the company.");
    case "MEMBER_SUSPENDED": return tr("b2b.setup.err.suspended", "This person is suspended. Reactivate them first.");
    case "CURRENCY_IN_USE": return tr("b2b.setup.currency.lockedNoCount", "The currency is locked because jobs or job types already have amounts.");
    case "LOGO_INVALID": return tr("b2b.setup.profile.logo.invalid", "Use a JPEG, PNG or WebP image up to 2 MB.");
    case "CUSTOMER_ARCHIVED": return tr("b2b.clients.err.archived", "This client is archived. Restore it to create jobs.");
    case "MERGE_INVALID": return tr("b2b.clients.err.mergeInvalid", "These clients can't be merged. Nothing was changed.");
    case "RESOURCE_IN_USE": return tr("b2b.clients.err.inUse", "This client has history and can't be deleted. Archive it instead.");
    case "NOTE_FORBIDDEN": return tr("b2b.clients.err.noteForbidden", "Only the author can edit the text of a note.");
    case "IMPORT_IN_PROGRESS": return tr("b2b.import.err.inProgress", "Another import is running. Try again in a minute.");
    case "IMPORT_HAS_ERRORS": return tr("b2b.import.err.hasErrors", "Some rows have errors. Skip them or fix the file and upload it again.");
    case "IMPORT_HAS_NO_VALID_ROWS": return tr("b2b.import.err.noValid", "There is nothing valid to import. Fix the file and upload it again.");
    case "IMPORT_NOT_READY": return tr("b2b.import.err.notReady", "This import is no longer available. Upload the file again.");
    case "VALIDATION_ERROR": return tr("b2b.setup.err.validation", "Check the details you entered and try again.");
    case "FORBIDDEN": return tr("b2b.setup.err.forbidden", "You don't have access to do that. Ask an administrator.");
    case "NETWORK": return tr("b2b.setup.err.network", "You're offline or the server can't be reached. Reconnect and try again.");
    default:
  }
  if (err.isRateLimited) return tr("b2b.setup.err.busy", "Too many requests. Wait a moment and try again.");
  if (err.status === 403) return tr("b2b.setup.err.forbidden", "You don't have access to do that. Ask an administrator.");
  if (err.status === 404) return tr("b2b.setup.err.notFound", "That no longer exists, or you don't have access to it.");
  return tr("b2b.setup.err.generic", "Something went wrong. Try again in a moment.");
}

function duplicateFieldLabel(field: unknown, tr: Tr): string {
  switch (field) {
    case "email": return tr("b2b.setup.field.email", "email address");
    case "phone": return tr("b2b.setup.field.phone", "phone number");
    case "externalId":
    case "external_id": return tr("b2b.setup.field.externalId", "employee ID");
    default: return tr("b2b.setup.field.value", "value");
  }
}

/** Which form field a DUPLICATE_MEMBER error belongs to (or null). */
export function duplicateField(err: unknown): "workEmail" | "phone" | "externalId" | null {
  if (!isB2bError(err) || err.code !== "DUPLICATE_MEMBER") return null;
  const f = err.body.field;
  return f === "email" ? "workEmail" : f === "phone" ? "phone" : f === "externalId" || f === "external_id" ? "externalId" : null;
}

export type ClientField = "name" | "email" | "phone" | "billingAddress" | "externalId";
export type ClientFieldErrors = Partial<Record<ClientField, string>>;
const CLIENT_FIELDS: readonly ClientField[] = ["name", "email", "phone", "billingAddress", "externalId"];

/** Field-level problems of a failed client save (duplicate Client ID, invalid phone…), so they show under the field, not in a banner. */
export function clientFieldErrors(err: unknown, tr: Tr): ClientFieldErrors {
  return clientFormErrors(err, tr).fields;
}

/** Client dialog: every API field key on its field; tags/type/notes (no input of their own here) named in the banner. */
export function clientFormErrors(err: unknown, tr: Tr): FormErrors<ClientField> {
  const duplicateId = isB2bError(err) && err.code === "DUPLICATE_EXTERNAL_ID";
  return formErrorsFrom(err, {
    keys: CLIENT_FIELDS,
    aliases: { external_id: "externalId" },
    text: {
      externalId: duplicateId ? tr("b2b.clients.err.duplicateId", "Another client already has this Client ID.") : tr("b2b.clients.err.badId", "Use up to 100 characters and don't start with = + - or @."),
      phone: tr("b2b.clients.err.phone", "Enter a valid phone number, e.g. +34 600 555 021."),
      email: tr("b2b.clients.err.email", "Enter a valid email address."),
      name: tr("b2b.clients.err.name", "Enter the client's name."),
      billingAddress: tr("b2b.clients.err.billing", "Use up to 500 characters."),
    },
    labels: { tags: tr("b2b.clients.tags", "Tags"), type: tr("b2b.customers.type", "Type"), notes: tr("b2b.customers.notes", "Notes") },
  }, tr);
}

export interface FieldSpec<K extends string> {
  /** Form fields that can show an error. */
  keys: readonly K[];
  /** Translated message per field; without one the API's message is shown. */
  text?: Partial<Record<K, string>>;
  aliases?: Readonly<Record<string, K>>;
  /** Translated names of API keys the form has no input for (banner). */
  labels?: Readonly<Record<string, string>>;
}
export interface FormErrors<K extends string> { fields: Partial<Record<K, string>>; banner?: string }

/**
 * A failed save split into messages under fields and one banner. The banner names any field the form can't show, and otherwise only
 * appears when no field carries the problem (`fallback`, default: the plain-language setup message).
 */
export function formErrorsFrom<K extends string>(err: unknown, spec: FieldSpec<K>, tr: Tr, fallback?: (err: unknown) => string): FormErrors<K> {
  if (!err) return { fields: {} };
  const { fields, unknown } = splitApiFieldErrors(err, spec.keys, spec.aliases);
  const out: Partial<Record<K, string>> = {};
  for (const k of Object.keys(fields) as K[]) out[k] = spec.text?.[k] ?? fields[k];
  const named = unknownFieldsText(unknown, spec.labels ?? {}, tr);
  const banner = named ?? (Object.keys(out).length ? undefined : (fallback ? fallback(err) : setupErrorMessage(err, tr)));
  return { fields: out, banner };
}

/**
 * Banner text for API field problems a form has no input for, naming each field ("Teams: Invalid uuid"). The API's own message is shown
 * (it is the only detail we have); `labels` gives the translated field name, otherwise the API key is shown as is.
 */
export function unknownFieldsText(unknown: readonly ApiFieldIssue[], labels: Readonly<Record<string, string>>, tr: Tr): string | undefined {
  if (unknown.length === 0) return undefined;
  return unknown.map((u) => tr("b2b.form.err.field", "{field}: {message}", { field: labels[u.key] ?? u.key, message: u.message })).join(" ");
}

const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/**
 * 409 CURRENCY_IN_USE: "The currency is locked because 3 jobs have amounts and 1 job type has a default price." The API sends the two
 * counts (`jobsWithMoney`, `jobTypesWithPrice`); without them (older API) the message stays general.
 */
export function currencyLockedMessage(err: unknown, tr: Tr, trn: Trn): string {
  const body = isB2bError(err) ? err.body : {};
  const src = { ...body, ...(body.details && typeof body.details === "object" ? (body.details as Record<string, unknown>) : {}) };
  const jobs = count(src.jobsWithMoney);
  const types = count(src.jobTypesWithPrice);
  const parts = [
    jobs ? trn("b2b.setup.currency.jobsPart", { one: "{n} job has an amount", other: "{n} jobs have amounts" }, jobs) : null,
    types ? trn("b2b.setup.currency.typesPart", { one: "{n} job type has a default price", other: "{n} job types have default prices" }, types) : null,
  ].filter((x): x is string => !!x);
  if (parts.length === 0) return tr("b2b.setup.currency.lockedNoCount", "The currency is locked because jobs or job types already have amounts.");
  const what = parts.length === 2 ? tr("b2b.setup.currency.both", "{a} and {b}", { a: parts[0], b: parts[1] }) : parts[0];
  return tr("b2b.setup.currency.lockedBecause", "The currency is locked because {parts}.", { parts: what });
}
