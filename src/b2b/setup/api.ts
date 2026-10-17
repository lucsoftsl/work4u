import { apiFetch } from "@/lib/http";
import { b2b, orgPath, toB2bError, type B2bRequest } from "@/b2b/api/client";
import type { JobStatus, Paged } from "@/b2b/api/types";

// Company setup API (CONTRACT FOR ILKA: company setup in b2b/impl-log-backend.md). Base /api/b2b/orgs/:orgId.
// None of these writes are offline-queueable: office screens, sent online only.

export const sk = {
  settings: (orgId: string) => ["org", orgId, "settings"] as const,
  setup: (orgId: string) => ["org", orgId, "setup"] as const,
  roles: (orgId: string) => ["org", orgId, "roles"] as const,
  membersAll: (orgId: string) => ["org", orgId, "members"] as const,
  members: (orgId: string, q = "", loginStatus = "") => ["org", orgId, "members", "v2", q, loginStatus] as const,
  membersPaged: (orgId: string, q = "", loginStatus = "") => ["org", orgId, "members", "paged", q, loginStatus] as const,
  invitations: (orgId: string) => ["org", orgId, "invitations"] as const,
  imports: (orgId: string, kind?: string) => ["org", orgId, "imports", kind ?? "all"] as const,
  import: (orgId: string, id: string) => ["org", orgId, "import", id] as const,
  clientsAll: (orgId: string) => ["org", orgId, "customers"] as const,
  clients: (orgId: string, params: unknown) => ["org", orgId, "customers", "v2", params] as const,
  tags: (orgId: string) => ["org", orgId, "customers", "tags"] as const,
  client: (orgId: string, id: string) => ["org", orgId, "customer", id, "page"] as const,
  clientJobs: (orgId: string, id: string, params: unknown) => ["org", orgId, "customer", id, "jobs", params] as const,
  notes: (orgId: string, id: string) => ["org", orgId, "customer", id, "notes"] as const,
  timeline: (orgId: string, id: string) => ["org", orgId, "customer", id, "timeline"] as const,
  duplicates: (orgId: string) => ["org", orgId, "customers", "duplicates"] as const,
};

const send = <T>(orgId: string, path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", json?: unknown) =>
  b2b<T>(orgPath(orgId, path), { method, json });

// ---- company profile ------------------------------------------------------------------------------------------------
export interface CompanySettings {
  id: string; name: string; legalName: string | null; taxId: string | null; phone: string | null; addressLine: string | null;
  city: string | null; postalCode: string | null; country: string | null; timezone: string; locale: string | null;
  logoUrl: string | null; createdAt: string; canEdit: boolean;
}
export type SettingsPatch = Partial<Pick<CompanySettings, "name" | "legalName" | "taxId" | "phone" | "addressLine" | "city" | "postalCode" | "country" | "timezone" | "locale">>;
export const getSettings = (orgId: string) => b2b<CompanySettings>(orgPath(orgId, "/settings"));
export const patchSettings = (orgId: string, patch: SettingsPatch) => send<CompanySettings>(orgId, "/settings", "PATCH", patch);
export const uploadLogo = (orgId: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return b2b<CompanySettings>(orgPath(orgId, "/settings/logo"), { method: "POST", form });
};
export const deleteLogo = (orgId: string) => send<void>(orgId, "/settings/logo", "DELETE");

// ---- setup checklist -------------------------------------------------------------------------------------------------
export type SetupStepKey = "profile" | "team" | "employees" | "invites" | "clients" | "first_job";
export interface SetupStep { key: SetupStepKey; required: boolean; done: boolean; count?: number }
export interface SetupProgress { steps: SetupStep[]; completed: boolean; percent: number }
export const getSetup = (orgId: string) => b2b<SetupProgress>(orgPath(orgId, "/setup"));

// ---- employees -------------------------------------------------------------------------------------------------------
export type LoginStatus = "NONE" | "INVITED" | "ACTIVE";
export type MemberStatus = "ACTIVE" | "SUSPENDED" | "REMOVED";
export interface Role { id: string; name: string; template: string; isSystem?: boolean }
export interface Member {
  id: string; displayName: string; workEmail: string | null; phone: string | null; externalId: string | null;
  memberType: "EMPLOYEE" | "CONTRACTOR"; status: MemberStatus; loginStatus: LoginStatus; notifyChannel?: string;
  workingHours?: unknown; role: { id: string; name: string; template: string };
  /** From the list only: false = the viewer may not edit/suspend/remove this person (an Administrator, viewed by a non-admin). */
  canManage?: boolean;
}
export interface MemberInput {
  displayName?: string; workEmail?: string | null; phone?: string | null; externalId?: string | null;
  roleId?: string; memberType?: "EMPLOYEE" | "CONTRACTOR"; teamIds?: string[]; status?: MemberStatus;
}
export interface Invitation {
  id: string; email: string; roleId: string | null; memberType: string | null; status: string; memberId: string | null;
  expiresAt: string; createdAt: string;
}
export interface InvitationResult { id: string; email: string; expiresAt: string; token: string; memberId: string | null; emailSent: boolean }

export const listRoles = (orgId: string) => b2b<Role[]>(orgPath(orgId, "/roles"));
export const MEMBERS_PAGE_SIZE = 50;
export interface MembersPage { items: Member[]; total: number; limit: number; offset: number; hasMore: boolean; nextCursor: string | null }
/** Paged people list: server-side search and login filter, `cursor` for "Load more". */
export const listMembersPage = (orgId: string, params: { q?: string; loginStatus?: LoginStatus | ""; cursor?: string | null }, signal?: AbortSignal) =>
  b2b<MembersPage>(orgPath(orgId, "/members"), { query: { q: params.q || undefined, loginStatus: params.loginStatus || undefined, limit: MEMBERS_PAGE_SIZE, cursor: params.cursor || undefined }, signal });
export const listMembersV2 = (orgId: string, params: { q?: string; loginStatus?: LoginStatus | "" } = {}, signal?: AbortSignal) =>
  b2b<Member[]>(orgPath(orgId, "/members"), { query: { q: params.q || undefined, loginStatus: params.loginStatus || undefined }, signal });
/** Everyone who can be assigned a job: ACTIVE members, any team, with or without an app login. */
export const listAssignableMembers = (orgId: string) =>
  b2b<Array<Pick<Member, "id" | "displayName" | "loginStatus" | "canManage">>>(orgPath(orgId, "/members"), { query: { assignable: true } });
export const createMember = (orgId: string, input: MemberInput) => send<Member>(orgId, "/members", "POST", input);
export const updateMember = (orgId: string, memberId: string, patch: MemberInput) => send<Member>(orgId, `/members/${memberId}`, "PATCH", patch);
export const listInvitations = (orgId: string) => b2b<Invitation[]>(orgPath(orgId, "/invitations"));
export const createInvitation = (orgId: string, input: { email: string; memberId: string; roleId?: string }) =>
  send<InvitationResult>(orgId, "/invitations", "POST", input);
export const revokeInvitation = (orgId: string, invitationId: string) => send<void>(orgId, `/invitations/${invitationId}`, "DELETE");

// ---- CSV import (employees, customers) -----------------------------------------------------------------------------
export type ImportKindPath = "employees" | "customers";
export interface ImportIssue { field: string | null; code: string; message: string }
export type ImportAction = "CREATE" | "UPDATE" | "SKIP" | "ERROR";
export interface ImportRow {
  row: number; action: ImportAction; applied: boolean; match: { kind: string; id: string } | null;
  values: Record<string, unknown> | null; errors: ImportIssue[]; warnings: ImportIssue[];
}
export interface ImportCounts { create: number; update: number; skip: number; error: number; warning: number }
export type ImportStatus = "UPLOADED" | "VALIDATED" | "COMMITTING" | "DONE" | "FAILED" | "DISCARDED";
export interface ImportSummary {
  id: string; kind: "EMPLOYEES" | "CUSTOMERS"; status: ImportStatus | string; fileName: string | null; totalRows: number; counts: ImportCounts;
  processedRows: number; failureMessage: string | null; headers: string[]; createdAt: string; committedAt: string | null;
}
export interface ImportPreview extends ImportSummary {
  mapping?: { used: Record<string, string>; unmappedHeaders: string[] };
  rows: ImportRow[]; hasMoreRows: boolean;
}
export interface ImportOptions {
  defaultCountry?: string; createMissingTeams?: boolean; createMissingSkills?: boolean; clearEmpty?: boolean; matchByName?: boolean;
  encoding?: "utf-8" | "windows-1252" | "windows-1250" | "iso-8859-2"; delimiter?: string; mapping?: Record<string, string>;
}

/** Dry run: nothing but the preview is written. `options` is sent first (the API reads multipart in order). */
export const uploadImport = (orgId: string, kind: ImportKindPath, file: File, options: ImportOptions = {}) => {
  const form = new FormData();
  form.append("options", JSON.stringify(options));
  form.append("file", file);
  return b2b<ImportPreview>(orgPath(orgId, `/imports/${kind}`), { method: "POST", form });
};
export const getImport = (orgId: string, importId: string, signal?: AbortSignal) => b2b<ImportPreview>(orgPath(orgId, `/imports/${importId}`), { signal });
export const listImportRows = (orgId: string, importId: string, params: { action?: ImportAction; limit?: number; offset?: number } = {}) =>
  b2b<{ items?: ImportRow[]; rows?: ImportRow[] } | ImportRow[]>(orgPath(orgId, `/imports/${importId}/rows`), { query: params });
export const listImports = (orgId: string, kind?: ImportKindPath) => b2b<{ items: ImportSummary[] }>(orgPath(orgId, "/imports"), { query: { kind } });
export const discardImport = (orgId: string, importId: string) => send<void>(orgId, `/imports/${importId}`, "DELETE");
export const commitImport = (orgId: string, importId: string, skipErrorRows: boolean) =>
  send<ImportPreview>(orgId, `/imports/${importId}/commit`, "POST", skipErrorRows ? { skipErrorRows: true } : {});

/** Authenticated file download (CSV template / error report): fetch with the token, then save the blob. */
export async function downloadOrgFile(orgId: string, path: string, fallbackName: string): Promise<void> {
  const res = await apiFetch(`/api/b2b${orgPath(orgId, path)}`, { method: "GET", auth: true, cache: "no-store" } as RequestInit & { auth: boolean });
  if (!res.ok) throw await toB2bError(res);
  const blob = await res.blob();
  const name = /filename="?([^";]+)"?/i.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
export const downloadTemplate = (orgId: string, kind: ImportKindPath) => downloadOrgFile(orgId, `/imports/${kind}/template`, `${kind}-template.csv`);
export const downloadErrorReport = (orgId: string, importId: string) => downloadOrgFile(orgId, `/imports/${importId}/errors.csv`, "import-errors.csv");

// ---- clients v2 -------------------------------------------------------------------------------------------------------
export interface Client {
  id: string; externalId: string | null; name: string; type: "COMPANY" | "PERSON"; email: string | null; phone: string | null;
  billingAddress: string | null; tags: string[]; archivedAt: string | null; mergedIntoId: string | null; createdAt: string;
}
export interface ClientListParams { q?: string; tag?: string; archived?: "false" | "true" | "all"; sort?: "name" | "createdAt"; dir?: "asc" | "desc"; limit?: number; offset?: number }
export const CLIENTS_PAGE_SIZE = 25;
export const listClients = (orgId: string, params: ClientListParams, signal?: AbortSignal) =>
  b2b<Paged<Client>>(orgPath(orgId, "/customers"), { query: { ...params, limit: params.limit ?? CLIENTS_PAGE_SIZE, paged: true }, signal });
export const listTags = (orgId: string) => b2b<Array<{ tag: string; count: number }>>(orgPath(orgId, "/customers/tags"));

export interface ClientContact { id: string; name: string; role: string | null; email: string | null; phone: string | null; isPrimary: boolean }
export interface ClientLocation {
  id: string; label: string; addressLine: string; city?: string | null; postalCode?: string | null; country?: string | null;
  latitude?: number | null; longitude?: number | null; accessInstructions?: string | null; safetyInstructions?: string | null;
}
export interface ClientNote {
  id: string; body: string; pinned: boolean; author: { memberId: string; name: string } | null; createdAt: string; editedAt: string | null;
  canEdit: boolean; canDelete: boolean;
}
export interface ClientPage extends Client {
  legacyNote: string | null; locations: ClientLocation[]; contacts: ClientContact[]; pinnedNotes: ClientNote[];
  stats: { jobCount: number; openJobs: number; completedJobs: number; lastJobAt: string | null } | null;
}
export interface ClientInput { name: string; type: "COMPANY" | "PERSON"; email: string | null; phone: string | null; billingAddress: string | null; externalId?: string | null; tags?: string[] }
export const getClientPage = (orgId: string, id: string) => b2b<ClientPage>(orgPath(orgId, `/customers/${id}`));
export const createClient = (orgId: string, input: Omit<ClientInput, "tags">) => send<Client>(orgId, "/customers", "POST", input);
export const updateClient = (orgId: string, id: string, input: Partial<Omit<ClientInput, "tags">>) => send<Client>(orgId, `/customers/${id}`, "PATCH", input);
export const setClientTags = (orgId: string, id: string, tags: string[]) => send<{ tags: string[] }>(orgId, `/customers/${id}/tags`, "PUT", { tags });
export const archiveClient = (orgId: string, id: string) => send<unknown>(orgId, `/customers/${id}/archive`, "POST");
export const unarchiveClient = (orgId: string, id: string) => send<unknown>(orgId, `/customers/${id}/unarchive`, "POST");

export interface ContactInput { name: string; role?: string | null; email?: string | null; phone?: string | null; isPrimary?: boolean }
export const addContact = (orgId: string, id: string, input: ContactInput) => send<ClientContact>(orgId, `/customers/${id}/contacts`, "POST", input);
export const updateContact = (orgId: string, id: string, contactId: string, input: Partial<ContactInput>) => send<ClientContact>(orgId, `/customers/${id}/contacts/${contactId}`, "PATCH", input);
export const deleteContact = (orgId: string, id: string, contactId: string) => send<void>(orgId, `/customers/${id}/contacts/${contactId}`, "DELETE");

export const listNotes = (orgId: string, id: string, before?: string) =>
  b2b<{ items: ClientNote[] }>(orgPath(orgId, `/customers/${id}/notes`), { query: { limit: 50, before } });
export const addNote = (orgId: string, id: string, input: { body: string; pinned?: boolean }) => send<ClientNote>(orgId, `/customers/${id}/notes`, "POST", input);
export const updateNote = (orgId: string, id: string, noteId: string, patch: { body?: string; pinned?: boolean }) => send<ClientNote>(orgId, `/customers/${id}/notes/${noteId}`, "PATCH", patch);
export const deleteNote = (orgId: string, id: string, noteId: string) => send<void>(orgId, `/customers/${id}/notes/${noteId}`, "DELETE");

export interface ClientJobRow {
  id: string; reference: string; title: string; status: JobStatus | string; priority?: string | null; scheduledStart: string | null; scheduledEnd: string | null;
  completedAt: string | null; createdAt: string; location: { id: string; label: string } | null;
}
export const listClientJobs = (orgId: string, id: string, params: { status?: string; from?: string; to?: string; limit?: number; offset?: number } = {}, signal?: AbortSignal) =>
  b2b<Paged<ClientJobRow>>(orgPath(orgId, `/customers/${id}/jobs`), { query: { limit: 20, ...params }, signal });
export interface TimelineItem { type: "NOTE" | "JOB_CREATED" | "JOB_COMPLETED" | "CLIENT_EVENT" | string; at: string; [k: string]: unknown }
export const getClientTimeline = (orgId: string, id: string) => b2b<{ items: TimelineItem[] }>(orgPath(orgId, `/customers/${id}/timeline`), { query: { limit: 50 } });

export interface DuplicateGroup { reason: "EMAIL" | "PHONE" | "NAME"; key: string; customers: Array<{ id: string; name: string; email: string | null; phone: string | null }> }
export const findDuplicates = (orgId: string) => b2b<{ groups: DuplicateGroup[] }>(orgPath(orgId, "/customers/duplicates"));
export interface MergeResult { targetId: string; merges: Array<{ mergeId: string; sourceId: string; moved: { jobs: number; locations: number; contacts: number; notes: number; tags: number } }> }
export const mergeClients = (orgId: string, targetId: string, sourceIds: string[]) => send<MergeResult>(orgId, `/customers/${targetId}/merge`, "POST", { sourceIds });
export const revertMerge = (orgId: string, mergeId: string) => send<unknown>(orgId, `/customers/merges/${mergeId}/revert`, "POST");

export type { B2bRequest };
