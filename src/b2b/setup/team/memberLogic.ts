import { isValidEmail } from "@/b2b/lib/email";
import { personNameProblem } from "@/b2b/lib/person";
import type { Invitation, LoginStatus, Member } from "../api";

export type MemberBadge = "active" | "invited" | "planning" | "suspended";

/** Status badge per design §4.3. Suspended wins over login status. */
export function deriveBadge(m: Pick<Member, "status" | "loginStatus">): MemberBadge {
  if (m.status === "SUSPENDED") return "suspended";
  if (m.loginStatus === "INVITED") return "invited";
  if (m.loginStatus === "ACTIVE") return "active";
  return "planning";
}

export function daysSince(iso: string, now: number = Date.now()): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

/** Newest pending invitation per member id. */
export function pendingInvitesByMember(list: readonly Invitation[]): Record<string, Invitation> {
  const out: Record<string, Invitation> = {};
  for (const inv of list) {
    if (!inv.memberId || (inv.status && inv.status.toUpperCase() !== "PENDING")) continue;
    const prev = out[inv.memberId];
    if (!prev || Date.parse(inv.createdAt) > Date.parse(prev.createdAt)) out[inv.memberId] = inv;
  }
  return out;
}

export interface MemberFilters { loginStatus: LoginStatus | ""; roleId: string }

/** Role is filtered client-side; the login status filter is also applied here so it works on cached lists. */
export function filterMembers(members: readonly Member[], f: MemberFilters): Member[] {
  return members.filter((m) => (!f.loginStatus || m.loginStatus === f.loginStatus) && (!f.roleId || m.role.id === f.roleId));
}

export function countWithoutLogin(members: readonly Member[]): number {
  return members.filter((m) => m.loginStatus === "NONE").length;
}

export const isBlank = (v: string | null | undefined): boolean => !v || v.trim() === "";

/** Bulk invite: people with an email can be invited; the rest are listed and skipped. Already active/removed are ignored. */
export function splitInvitable(members: readonly Member[]): { invitable: Member[]; skipped: Member[] } {
  const eligible = members.filter((m) => m.loginStatus !== "ACTIVE" && m.status === "ACTIVE");
  return { invitable: eligible.filter((m) => !isBlank(m.workEmail)), skipped: eligible.filter((m) => isBlank(m.workEmail)) };
}

/** Link to copy when the email could not be sent. The origin is passed in (never hard-coded). */
export function buildInviteLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/b2b/invite/${encodeURIComponent(token)}`;
}

/** Same rule as the API's member email check, so an invite or a save is never refused for a format the form accepted. */
export const isEmail = (v: string): boolean => isValidEmail(v);

/** Roles the viewer may pick: Administrator only for Administrators; falls back to the current role when the list is unavailable. */
export function selectableRoles<R extends { id: string; template: string }>(roles: readonly R[] | undefined, viewerTemplate: string | undefined, current?: R): R[] {
  if (!roles || roles.length === 0) return current ? [current] : [];
  const isAdmin = viewerTemplate === "ADMIN";
  const list = roles.filter((r) => isAdmin || r.template !== "ADMIN");
  return current && !list.some((r) => r.id === current.id) ? [current, ...list] : list;
}

/** Builds the PATCH body from only the fields that changed (empty strings become null). */
export function buildMemberPatch(form: MemberForm, original: Member): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const nn = (v: string) => (v.trim() === "" ? null : v.trim());
  if (form.displayName.trim() !== (original.displayName ?? "")) patch.displayName = form.displayName.trim();
  if (nn(form.workEmail) !== (original.workEmail ?? null)) patch.workEmail = nn(form.workEmail);
  if (nn(form.phone) !== (original.phone ?? null)) patch.phone = nn(form.phone);
  if (nn(form.externalId) !== (original.externalId ?? null)) patch.externalId = nn(form.externalId);
  if (form.roleId && form.roleId !== original.role.id) patch.roleId = form.roleId;
  if (form.memberType !== original.memberType) patch.memberType = form.memberType;
  return patch;
}

export interface MemberForm { displayName: string; workEmail: string; phone: string; externalId: string; roleId: string; memberType: "EMPLOYEE" | "CONTRACTOR" }

export function formFromMember(m?: Member): MemberForm {
  return { displayName: m?.displayName ?? "", workEmail: m?.workEmail ?? "", phone: m?.phone ?? "", externalId: m?.externalId ?? "", roleId: m?.role.id ?? "", memberType: m?.memberType ?? "EMPLOYEE" };
}

export function buildCreateBody(form: MemberForm): Record<string, unknown> {
  const body: Record<string, unknown> = { displayName: form.displayName.trim(), memberType: form.memberType };
  if (form.workEmail.trim()) body.workEmail = form.workEmail.trim();
  if (form.phone.trim()) body.phone = form.phone.trim();
  if (form.externalId.trim()) body.externalId = form.externalId.trim();
  if (form.roleId) body.roleId = form.roleId;
  return body;
}

/**
 * May the viewer edit/suspend/remove this person? The API says so per row (`canManage`); older responses fall back to the role rule:
 * needs member.manage, and only an Administrator may touch an Administrator. The API still refuses (ADMIN_ONLY) if forced.
 */
export function canManageRow(member: Pick<Member, "canManage" | "role">, viewerCanManage: boolean, viewerTemplate: string | undefined): boolean {
  if (!viewerCanManage) return false;
  if (typeof member.canManage === "boolean") return member.canManage;
  return member.role.template !== "ADMIN" || viewerTemplate === "ADMIN";
}

/** A name a manager types for a person: required, and never an email address (the API refuses both with 400 fields.displayName). */
export const memberNameProblem = (name: string): "required" | "email" | null => personNameProblem(name);

/** Drawer fields in display order (focus goes to the first invalid one). */
export const MEMBER_FIELDS = ["displayName", "phone", "workEmail", "roleId", "memberType", "externalId"] as const;
export type MemberField = (typeof MEMBER_FIELDS)[number];
/** API keys that belong to a drawer field under another name (DUPLICATE_MEMBER says "email"; roleTemplate is the role). */
export const MEMBER_FIELD_ALIASES: Readonly<Record<string, MemberField>> = { email: "workEmail", external_id: "externalId", roleTemplate: "roleId" };

// The API's members rule: E.164 after removing spaces, dots, dashes and brackets (no national numbers, unlike clients).
const MEMBER_PHONE = /^\+[1-9]\d{7,14}$/;
export const isMemberPhone = (v: string): boolean => MEMBER_PHONE.test(v.trim().replace(/[\s().-]/g, ""));

export type MemberProblem = "required" | "notEmail" | "invalid";
/** Client-side checks that mirror the API's createMember/updateMember schema; empty optional fields are fine. */
export function memberFormProblems(form: MemberForm): Partial<Record<MemberField, MemberProblem>> {
  const out: Partial<Record<MemberField, MemberProblem>> = {};
  const name = memberNameProblem(form.displayName);
  if (name) out.displayName = name === "email" ? "notEmail" : "required";
  if (form.phone.trim() && !isMemberPhone(form.phone)) out.phone = "invalid";
  if (form.workEmail.trim() && !isValidEmail(form.workEmail)) out.workEmail = "invalid";
  if (form.externalId.trim().length > 100) out.externalId = "invalid";
  return out;
}
