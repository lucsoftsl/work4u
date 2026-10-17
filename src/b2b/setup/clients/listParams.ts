import type { ClientListParams } from "@/b2b/setup/api";
import { CLIENTS_PAGE_SIZE } from "@/b2b/setup/api";
import { pageOffset, parsePage } from "@/b2b/lib/paging";

export type ArchivedFilter = "false" | "true" | "all";
export type ClientSort = "name" | "createdAt";
export interface ClientListState { q: string; tag: string; archived: ArchivedFilter; sort: ClientSort; page: number }

export const DEFAULT_LIST_STATE: ClientListState = { q: "", tag: "", archived: "false", sort: "name", page: 1 };

interface ParamReader { get(name: string): string | null }

export function parseListState(sp: ParamReader): ClientListState {
  const archived = sp.get("archived");
  const sort = sp.get("sort");
  return {
    q: (sp.get("q") ?? "").trim(),
    tag: (sp.get("tag") ?? "").trim(),
    archived: archived === "true" || archived === "all" ? archived : "false",
    sort: sort === "createdAt" ? "createdAt" : "name",
    page: parsePage(sp.get("page")),
  };
}

/** URL for a list state; defaults are omitted. Changing any filter resets to page 1 unless `page` is given. */
export function listHref(pathname: string, state: ClientListState): string {
  const sp = new URLSearchParams();
  if (state.q) sp.set("q", state.q);
  if (state.tag) sp.set("tag", state.tag);
  if (state.archived !== "false") sp.set("archived", state.archived);
  if (state.sort !== "name") sp.set("sort", state.sort);
  if (state.page > 1) sp.set("page", String(state.page));
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function toApiParams(s: ClientListState): ClientListParams {
  return {
    q: s.q || undefined, tag: s.tag || undefined, archived: s.archived, sort: s.sort,
    dir: s.sort === "createdAt" ? "desc" : "asc", limit: CLIENTS_PAGE_SIZE, offset: pageOffset(s.page, CLIENTS_PAGE_SIZE),
  };
}

export const hasActiveFilters = (s: ClientListState): boolean => !!(s.q || s.tag || s.archived !== "false");
