import { fmt, fallback } from "./plural";
import { identityT, type Translate } from "./tech-actions";
import { isB2bError } from "@/b2b/api/client";
import type { CustomerDetail, CustomerInput, CustomerLocation, LocationInput, OrgMemberRow, Skill } from "@/b2b/api/catalog-types";
import { isValidEmail } from "./email";
import type { PermissionKey } from "./permissions";

// Pure helpers for the Teams and Customers screens.

export type Can = (permission: PermissionKey) => boolean;

export interface CatalogActions {
  createTeam: boolean; editTeam: boolean; changeTeamStatus: boolean; manageSkills: boolean; assignSkills: boolean;
  viewMembers: boolean; createCustomer: boolean; editCustomer: boolean; deleteCustomer: boolean; editLocations: boolean;
}

/** Which controls a viewer sees. Display hint only; the API enforces. */
export function catalogActions(can: Can): CatalogActions {
  const team = can("team.manage");
  const customer = can("customer.manage");
  return {
    createTeam: team, editTeam: team, manageSkills: team, assignSkills: team,
    changeTeamStatus: can("team.status"), viewMembers: can("member.view"),
    createCustomer: customer, editCustomer: customer, deleteCustomer: customer, editLocations: customer,
  };
}

const norm = (s: string) => s.trim().toLowerCase();

export function filterMembers(members: readonly OrgMemberRow[], query: string, skillId?: string, skills: readonly Skill[] = []): OrgMemberRow[] {
  const q = norm(query);
  const allowed = skillId ? new Set(skills.find((s) => s.id === skillId)?.memberIds ?? []) : null;
  return members.filter(
    (m) => (!allowed || allowed.has(m.id)) && (!q || norm(m.displayName ?? "").includes(q) || norm(m.workEmail ?? "").includes(q))
  );
}

export function filterSkills(skills: readonly Skill[], query: string): Skill[] {
  const q = norm(query);
  return q ? skills.filter((s) => norm(s.name).includes(q)) : [...skills];
}

/** memberId -> skills the member has. */
export function skillsByMember(skills: readonly Skill[]): Map<string, Skill[]> {
  const map = new Map<string, Skill[]>();
  for (const s of skills) for (const id of s.memberIds) map.set(id, [...(map.get(id) ?? []), s]);
  return map;
}

export function memberSkillIds(skills: readonly Skill[], memberId: string): string[] {
  return skills.filter((s) => s.memberIds.includes(memberId)).map((s) => s.id);
}

export interface IdDiff { added: string[]; removed: string[]; changed: boolean }
export function diffIds(before: readonly string[], after: readonly string[]): IdDiff {
  const b = new Set(before), a = new Set(after);
  const added = [...a].filter((id) => !b.has(id));
  const removed = [...b].filter((id) => !a.has(id));
  return { added, removed, changed: added.length + removed.length > 0 };
}

export function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/** After removing members from a team, the lead must still be a member. */
export function leadAfterMemberChange(leadId: string | null | undefined, memberIds: readonly string[]): string | null {
  return leadId && memberIds.includes(leadId) ? leadId : null;
}

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

export function validateName(name: string, max: number, label: string, t: Translate = identityT): string | undefined {
  const v = name.trim();
  if (!v) return fmt(t("b2b.catalog.required", "{label} is required."), { label });
  if (v.length > max) return fmt(t("b2b.catalog.tooLong", "{label} must be {max} characters or fewer."), { label, max });
  return undefined;
}

const emptyToNull = (s: string) => (s.trim() ? s.trim() : null);

export interface CustomerForm { name: string; type: "COMPANY" | "PERSON"; email: string; phone: string; billingAddress: string; notes: string }
export const EMPTY_CUSTOMER_FORM: CustomerForm = { name: "", type: "COMPANY", email: "", phone: "", billingAddress: "", notes: "" };

export function validateCustomer(f: CustomerForm, t: Translate = identityT): FieldErrors<keyof CustomerForm> {
  const errors: FieldErrors<keyof CustomerForm> = {};
  const name = validateName(f.name, 200, t("b2b.catalog.label.name", "Name"), t);
  if (name) errors.name = name;
  if (f.email.trim() && !isValidEmail(f.email)) errors.email = t("b2b.catalog.email", "Enter a valid email address.");
  if (f.phone.trim().length > 40) errors.phone = fmt(t("b2b.catalog.tooLong", "{label} must be {max} characters or fewer."), { label: t("b2b.catalog.label.phone", "Phone"), max: 40 });
  if (f.billingAddress.trim().length > 500) errors.billingAddress = fmt(t("b2b.catalog.tooLong", "{label} must be {max} characters or fewer."), { label: t("b2b.catalog.label.billing", "Billing address"), max: 500 });
  if (f.notes.trim().length > 5000) errors.notes = fmt(t("b2b.catalog.tooLong", "{label} must be {max} characters or fewer."), { label: t("b2b.catalog.label.notes", "Notes"), max: 5000 });
  return errors;
}

export function customerInput(f: CustomerForm): CustomerInput {
  return { name: f.name.trim(), type: f.type, email: emptyToNull(f.email), phone: emptyToNull(f.phone), billingAddress: emptyToNull(f.billingAddress), notes: emptyToNull(f.notes) };
}

export function customerToForm(c: Pick<CustomerDetail, "name" | "type" | "email" | "phone" | "billingAddress" | "notes">): CustomerForm {
  return { name: c.name, type: c.type ?? "COMPANY", email: c.email ?? "", phone: c.phone ?? "", billingAddress: c.billingAddress ?? "", notes: c.notes ?? "" };
}

export interface LocationForm {
  label: string; addressLine: string; city: string; postalCode: string; country: string; latitude: string; longitude: string;
  accessInstructions: string; safetyInstructions: string;
}
export const EMPTY_LOCATION_FORM: LocationForm = { label: "", addressLine: "", city: "", postalCode: "", country: "", latitude: "", longitude: "", accessInstructions: "", safetyInstructions: "" };

function parseCoord(raw: string): number | null | "invalid" {
  if (!raw.trim()) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : "invalid";
}

export function validateLocation(f: LocationForm, t: Translate = identityT): FieldErrors<keyof LocationForm> {
  const errors: FieldErrors<keyof LocationForm> = {};
  const label = validateName(f.label, 200, t("b2b.catalog.label.label", "Label"), t);
  if (label) errors.label = label;
  const addr = validateName(f.addressLine, 300, t("b2b.catalog.label.address", "Address"), t);
  if (addr) errors.addressLine = addr;
  if (f.country.trim() && f.country.trim().length !== 2) errors.country = t("b2b.catalog.country", "Use a 2-letter country code, for example ES.");
  const lat = parseCoord(f.latitude), lng = parseCoord(f.longitude);
  if (lat === "invalid" || (typeof lat === "number" && (lat < -90 || lat > 90))) errors.latitude = t("b2b.catalog.lat", "Latitude must be between -90 and 90.");
  if (lng === "invalid" || (typeof lng === "number" && (lng < -180 || lng > 180))) errors.longitude = t("b2b.catalog.lng", "Longitude must be between -180 and 180.");
  if (f.accessInstructions.trim().length > 5000) errors.accessInstructions = fmt(t("b2b.catalog.tooLong", "{label} must be {max} characters or fewer."), { label: t("b2b.catalog.label.access", "Access instructions"), max: 5000 });
  if (f.safetyInstructions.trim().length > 5000) errors.safetyInstructions = fmt(t("b2b.catalog.tooLong", "{label} must be {max} characters or fewer."), { label: t("b2b.catalog.label.safety", "Safety instructions"), max: 5000 });
  return errors;
}

export function locationInput(f: LocationForm): LocationInput {
  const lat = parseCoord(f.latitude), lng = parseCoord(f.longitude);
  return {
    label: f.label.trim(), addressLine: f.addressLine.trim(), city: emptyToNull(f.city), postalCode: emptyToNull(f.postalCode),
    country: f.country.trim() ? f.country.trim().toUpperCase() : null,
    latitude: typeof lat === "number" ? lat : null, longitude: typeof lng === "number" ? lng : null,
    accessInstructions: emptyToNull(f.accessInstructions), safetyInstructions: emptyToNull(f.safetyInstructions),
  };
}

export function locationToForm(l: CustomerLocation): LocationForm {
  return {
    label: l.label, addressLine: l.addressLine, city: l.city ?? "", postalCode: l.postalCode ?? "", country: l.country ?? "",
    latitude: l.latitude == null ? "" : String(l.latitude), longitude: l.longitude == null ? "" : String(l.longitude),
    accessInstructions: l.accessInstructions ?? "", safetyInstructions: l.safetyInstructions ?? "",
  };
}

export type CatalogSubject = "team" | "skill" | "customer" | "location";

/** English fallbacks for "no longer exists", per subject (keys b2b.catalog.err.gone.*). */
export const GONE: Record<CatalogSubject, string> = {
  team: fallback("This team no longer exists. Refresh the page."),
  skill: fallback("This skill no longer exists. Refresh the page."),
  customer: fallback("This customer no longer exists. Refresh the page."),
  location: fallback("This location no longer exists. Refresh the page."),
};

/** Plain-language message for a failed catalog request. */
export function catalogErrorMessage(err: unknown, subject: CatalogSubject, t: Translate = identityT): string {
  if (!isB2bError(err)) return t("b2b.catalog.err.generic", "Something went wrong. Try again.");
  if (err.code === "NETWORK") return t("b2b.catalog.err.network", "Can't reach the server. Check your connection and try again.");
  if (err.code === "MIGRATION_PENDING" || err.isMigrationPending) return t("b2b.catalog.err.pending", "This feature isn't available yet for your workspace. Ask an administrator to finish the setup.");
  if (err.status === 403) return t("b2b.catalog.err.forbidden", "You don't have permission to do that. Ask a manager or administrator.");
  if (err.status === 404) return t(`b2b.catalog.err.gone.${subject}`, GONE[subject]);
  if (err.code === "RESOURCE_IN_USE") {
    const msg: Record<CatalogSubject, string> = {
      skill: fallback("This skill is required by a job, so it can't be deleted. Remove it from those jobs first."),
      customer: fallback("This customer has jobs, so it can't be deleted."),
      location: fallback("Jobs are scheduled at this location, so it can't be deleted."),
      team: fallback("This team is in use and can't be removed. Deactivate it instead."),
    };
    return t(`b2b.catalog.err.inUse.${subject}`, msg[subject]);
  }
  if (err.code === "VALIDATION_ERROR" || err.code === "INVALID_REFERENCE") {
    const first = Object.values(err.fields)[0];
    return first ? fmt(t("b2b.catalog.err.form", "Check the form: {first}"), { first }) : t("b2b.catalog.err.formGeneric", "Check the form and try again.");
  }
  if (err.code === "RATE_LIMITED") return t("b2b.catalog.err.rate", "Too many requests. Wait a moment and try again.");
  return err.status >= 500 ? t("b2b.catalog.err.server", "The server had a problem. Try again in a moment.") : err.message || t("b2b.catalog.err.generic", "Something went wrong. Try again.");
}

/** True when a members list failed because the viewer lacks member.view (hide the section instead of erroring). */
export const isForbidden = (err: unknown) => isB2bError(err) && err.status === 403;
