import { isB2bError } from "@/b2b/api/client";

type Tr = (key: string, fallback: string, vars?: Record<string, string | number>) => string;

/** A plain-language message for a failed company-setup request. Never shows codes or "403"; says what to do. */
export function setupErrorMessage(err: unknown, tr: Tr): string {
  if (!isB2bError(err)) return tr("b2b.setup.err.generic", "Something went wrong. Try again in a moment.");
  switch (err.code) {
    case "ADMIN_ONLY": return tr("b2b.setup.err.adminOnly", "Only an Administrator can do that for an Administrator role.");
    case "DUPLICATE_MEMBER": return tr("b2b.setup.err.duplicate", "Another person already has this {field}.", { field: duplicateFieldLabel(err.body.field, tr) });
    case "MEMBER_ALREADY_CLAIMED": return tr("b2b.setup.err.claimed", "This person already joined with an invitation.");
    case "MEMBER_REMOVED": return tr("b2b.setup.err.removed", "This person was removed from the company.");
    case "MEMBER_SUSPENDED": return tr("b2b.setup.err.suspended", "This person is suspended. Reactivate them first.");
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

export type ClientFieldErrors = Partial<Record<"externalId" | "phone" | "email" | "name", string>>;

/** Field-level problems of a failed client save (duplicate Client ID, invalid phone…), so they show under the field, not in a banner. */
export function clientFieldErrors(err: unknown, tr: Tr): ClientFieldErrors {
  if (!isB2bError(err)) return {};
  if (err.code === "DUPLICATE_EXTERNAL_ID") return { externalId: tr("b2b.clients.err.duplicateId", "Another client already has this Client ID.") };
  if (err.status !== 400) return {};
  const fields = err.fields;
  const out: ClientFieldErrors = {};
  if (fields.externalId) out.externalId = tr("b2b.clients.err.badId", "Use up to 100 characters and don't start with = + - or @.");
  if (fields.phone) out.phone = tr("b2b.clients.err.phone", "Enter a valid phone number, e.g. +34 600 555 021.");
  if (fields.email) out.email = tr("b2b.clients.err.email", "Enter a valid email address.");
  if (fields.name) out.name = tr("b2b.clients.err.name", "Enter the client's name.");
  return out;
}
