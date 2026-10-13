import { b2b, orgPath } from "./client";
import type { JobList, Paged, TeamStatus, Team, WorkingHours } from "./types";
import type { Customer, CustomerDetail, CustomerInput, CustomerLocation, LocationInput, OrgMemberRow, Skill } from "./catalog-types";

// Teams / skills / members / customers. Keys all start with ["org", orgId, …] (see endpoints.ts qk).
export const ck = {
  members: (orgId: string) => ["org", orgId, "members"] as const,
  skills: (orgId: string) => ["org", orgId, "skills"] as const,
  customers: (orgId: string, q = "", page = 1) => ["org", orgId, "customers", q, page] as const,
  customersAll: (orgId: string) => ["org", orgId, "customers"] as const,
  customer: (orgId: string, id: string) => ["org", orgId, "customer", id] as const,
  customerJobs: (orgId: string, id: string) => ["org", orgId, "customer", id, "jobs"] as const,
};

const send = <T>(orgId: string, path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", json?: unknown) =>
  b2b<T>(orgPath(orgId, path), { method, json });

export const listMembers = (orgId: string) => b2b<OrgMemberRow[]>(orgPath(orgId, "/members"));
export const listSkills = (orgId: string) => b2b<Skill[]>(orgPath(orgId, "/skills"));
export const createSkill = (orgId: string, name: string) => send<Skill>(orgId, "/skills", "POST", { name });
export const renameSkill = (orgId: string, skillId: string, name: string) => send<Skill>(orgId, `/skills/${skillId}`, "PATCH", { name });
export const deleteSkill = (orgId: string, skillId: string) => send<void>(orgId, `/skills/${skillId}`, "DELETE");
export const setMemberSkills = (orgId: string, memberId: string, skillIds: string[]) =>
  send<unknown>(orgId, `/members/${memberId}/skills`, "PUT", { skillIds });

export const createTeam = (orgId: string, input: { name: string; leadMemberId?: string | null; memberIds?: string[] }) =>
  send<Team>(orgId, "/teams", "POST", input);
export const updateTeam = (orgId: string, teamId: string, patch: { name?: string; leadMemberId?: string | null; active?: boolean; workingHours?: WorkingHours | null }) =>
  send<Team>(orgId, `/teams/${teamId}`, "PATCH", patch);
export const setTeamMembers = (orgId: string, teamId: string, memberIds: string[]) =>
  send<unknown>(orgId, `/teams/${teamId}/members`, "PUT", { memberIds });
export const setTeamStatus = (orgId: string, teamId: string, status: TeamStatus) =>
  send<unknown>(orgId, `/teams/${teamId}/status`, "PATCH", { status });

/** Plain array (the API only pages when asked to). Used by the pickers. */
export const listCustomers = (orgId: string, q: string, signal?: AbortSignal) =>
  b2b<Customer[]>(orgPath(orgId, "/customers"), { query: { q: q || undefined }, signal });
export const CUSTOMERS_PAGE_SIZE = 25;
/** Paged envelope: `paged=true` opts in; offset drives previous/next. */
export const listCustomersPage = (orgId: string, params: { q?: string; offset?: number; limit?: number }, signal?: AbortSignal) =>
  b2b<Paged<Customer>>(orgPath(orgId, "/customers"), {
    query: { q: params.q || undefined, paged: true, limit: params.limit ?? CUSTOMERS_PAGE_SIZE, offset: params.offset ?? 0 },
    signal,
  });
export const getCustomer = (orgId: string, id: string) => b2b<CustomerDetail>(orgPath(orgId, `/customers/${id}`));
export const createCustomer = (orgId: string, input: CustomerInput) => send<Customer>(orgId, "/customers", "POST", input);
export const updateCustomer = (orgId: string, id: string, input: CustomerInput) => send<Customer>(orgId, `/customers/${id}`, "PATCH", input);
export const deleteCustomer = (orgId: string, id: string) => send<void>(orgId, `/customers/${id}`, "DELETE");
export const createLocation = (orgId: string, customerId: string, input: LocationInput) =>
  send<CustomerLocation>(orgId, `/customers/${customerId}/locations`, "POST", input);
export const updateLocation = (orgId: string, customerId: string, locationId: string, input: LocationInput) =>
  send<CustomerLocation>(orgId, `/customers/${customerId}/locations/${locationId}`, "PATCH", input);
export const deleteLocation = (orgId: string, customerId: string, locationId: string) =>
  send<void>(orgId, `/customers/${customerId}/locations/${locationId}`, "DELETE");
export const listCustomerJobs = (orgId: string, customerId: string) =>
  b2b<JobList>(orgPath(orgId, "/jobs"), { query: { customerId, limit: 20 } });
