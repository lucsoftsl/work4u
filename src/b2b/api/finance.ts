import { downloadOrgFile } from "@/b2b/setup/api";
import { b2b, buildQuery, orgPath } from "./client";

// Finance overview (01267d10), finance.view only, read-only. All under /api/b2b/orgs/:orgId/finance, `no-store`.
// Money is integer minor units of `currency`. Margins are null while a side is unknown; never show a guessed zero.

export type FinanceBasis = "completed" | "scheduled";
export type FinanceBy = "client" | "team" | "jobType" | "technician";
export type FinancePeriod = "day" | "week" | "month";
export type FinanceKind = "all" | "earned" | "pipeline";
/** Jobs list / CSV only: jobs with no price, no cost, or either one missing. */
export type FinanceMissing = "price" | "cost" | "any";

export interface FinanceFilters { from?: string; to?: string; basis?: FinanceBasis; customerId?: string; teamId?: string; memberId?: string; jobTypeId?: string }

export interface Figures { jobs: number; revenue: number; cost: number; margin: number | null; marginPct: number | null }
export interface FiguresWithGaps extends Figures { jobsWithoutPrice: number; jobsWithoutCost: number }
export interface SeriesBucket { period: string; start: string; earned: Figures; pipeline: Figures }
export interface FinanceSummary {
  /** The company's currency, or the suggestion while it has none (`currencyIsSet` false: there can be no amounts). */
  currency: string; currencyIsSet?: boolean; basis: FinanceBasis; timezone: string; from: string; to: string; period: FinancePeriod;
  earned: FiguresWithGaps; pipeline: FiguresWithGaps; series: SeriesBucket[];
}
export interface BreakdownItem extends Figures { key: string | null; name: string | null }
export interface FinanceBreakdown {
  currency: string; by: FinanceBy | "status"; basis: FinanceBasis; from: string; to: string; items: BreakdownItem[];
  /** Over EVERY group, never just this page. */
  totals: Figures;
  /** Number of groups, and the paging of this response. */
  total: number; limit: number; offset: number; hasMore: boolean; nextOffset: number | null;
  /** total > items.length: the table shows only part of the groups. */
  truncated: boolean;
}
export interface FinanceJobItem {
  id: string; reference: string; title: string; status: string; kind: "EARNED" | "PIPELINE";
  customer: { id: string; name: string } | null; jobType: { id: string; name: string } | null;
  completedAt: string | null; scheduledStart: string | null;
  price: number | null; cost: number | null; margin: number | null; marginPct: number | null;
  teams: Array<{ id: string; name: string }>; technicians: Array<{ id: string; name: string | null }>;
}
export interface FinanceJobs {
  currency: string; basis: FinanceBasis; from: string; to: string; totals: Figures; items: FinanceJobItem[];
  total: number; limit: number; offset: number; hasMore: boolean; nextOffset: number | null; nextCursor: string | null;
}

export const fk = {
  all: (orgId: string) => ["org", orgId, "finance"] as const,
  summary: (orgId: string, f: unknown) => ["org", orgId, "finance", "summary", f] as const,
  breakdown: (orgId: string, by: string, f: unknown) => ["org", orgId, "finance", "breakdown", by, f] as const,
  jobs: (orgId: string, f: unknown) => ["org", orgId, "finance", "jobs", f] as const,
};

const base = (orgId: string, path: string) => orgPath(orgId, `/finance${path}`);
export const getFinanceSummary = (orgId: string, f: FinanceFilters, signal?: AbortSignal) => b2b<FinanceSummary>(base(orgId, "/summary"), { query: { ...f }, signal });
export const getFinanceBreakdown = (orgId: string, by: FinanceBy, f: FinanceFilters & { limit?: number; offset?: number }, signal?: AbortSignal) =>
  b2b<FinanceBreakdown>(base(orgId, "/breakdown"), { query: { ...f, by }, signal });
export const getFinanceJobs = (orgId: string, f: FinanceFilters & { kind?: FinanceKind; missing?: FinanceMissing; limit?: number; offset?: number }, signal?: AbortSignal) =>
  b2b<FinanceJobs>(base(orgId, "/jobs"), { query: { ...f }, signal });

/** Every job of the period with the current filters (up to 20,000 rows), as a file: fetched with the auth header, then saved from a blob. */
export const downloadFinanceCsv = (orgId: string, f: FinanceFilters & { kind?: FinanceKind; missing?: FinanceMissing }) =>
  downloadOrgFile(orgId, `/finance/jobs.csv${buildQuery({ ...f })}`, "finance-jobs.csv");
