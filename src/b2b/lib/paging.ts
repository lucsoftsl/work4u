import type { JobList } from "@/b2b/api/types";

// List totals. Paged lists answer {items,total,limit,offset,hasMore,...}; the helpers still tolerate an older server without `total`.

export type JobListWithTotal = JobList & { total?: number };

export function readTotal(res: { total?: unknown } | null | undefined): number | undefined {
  const t = res?.total;
  return typeof t === "number" && Number.isFinite(t) && t >= 0 ? Math.floor(t) : undefined;
}

export const totalPages = (total: number, pageSize: number): number => Math.max(1, Math.ceil(total / pageSize));

/** 1-based inclusive range shown on this page, e.g. {from: 26, to: 50}. `count` = items on the page. */
export function pageRange(page: number, pageSize: number, count: number): { from: number; to: number } | null {
  if (count <= 0) return null;
  const from = (page - 1) * pageSize + 1;
  return { from, to: from + count - 1 };
}

export type PageToken = number | "gap";

/** Numbered paging with first/last and a window around the current page: 1 … 4 5 6 … 20. */
export function pageTokens(page: number, pages: number, radius = 1): PageToken[] {
  const keep = new Set<number>([1, pages]);
  for (let p = page - radius; p <= page + radius; p++) if (p >= 1 && p <= pages) keep.add(p);
  const sorted = [...keep].sort((a, b) => a - b);
  const out: PageToken[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function hasNextPage(page: number, pageSize: number, count: number, total: number | undefined): boolean {
  return total === undefined ? count >= pageSize : page * pageSize < total;
}

/** 1-based page from a URL param; anything invalid is page 1. */
export function parsePage(v: string | null | undefined): number {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

export const pageOffset = (page: number, pageSize: number): number => (Math.max(1, page) - 1) * pageSize;

/** Customers list URL: ?q= and ?page= (page 1 omitted). */
export function customersHref(pathname: string, q: string, page: number): string {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
