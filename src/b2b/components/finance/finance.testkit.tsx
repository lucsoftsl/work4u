import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { BreakdownItem, FinanceBreakdown, FinanceJobItem, FinanceJobs, FinanceSummary, Figures } from "@/b2b/api/finance";

// Shared by the finance component tests: a URL store behind the mocked next/navigation, and API fixtures. Not a test file.

const nav = { search: "", replaced: [] as string[], subs: new Set<() => void>() };
export const navStore = {
  set(qs: string) { nav.search = qs; nav.subs.forEach((f) => f()); },
  get replaced() { return nav.replaced; },
  reset(qs = "") { nav.search = qs; nav.replaced = []; },
};
const router = {
  replace: (url: string) => { nav.replaced.push(url); navStore.set(url.split("?")[1] ?? ""); },
  push: (url: string) => { nav.replaced.push(url); },
};
export const navigationMock = {
  useRouter: () => router,
  usePathname: () => "/ops/org/finance",
  useSearchParams: () => {
    const qs = useSyncExternalStore((cb) => { nav.subs.add(cb); return () => { nav.subs.delete(cb); }; }, () => nav.search, () => "");
    return useMemo(() => new URLSearchParams(qs), [qs]);
  },
};

export const i18nMock = { useTranslation: () => ({ locale: "en", t: (_key: string, fallback: string) => fallback }) };

export function stubMedia(wide: boolean) {
  window.matchMedia = ((query: string) => ({ matches: wide, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
}

export const TODAY_ISO = "2026-10-19T10:00:00Z";

const fig = (over: Partial<Figures> = {}): Figures => ({ jobs: 0, revenue: 0, cost: 0, margin: null, marginPct: null, ...over });

export function summaryFixture(over: Partial<FinanceSummary> = {}): FinanceSummary {
  return {
    currency: "RON", basis: "completed", timezone: "UTC", from: "2026-10-01", to: "2026-10-31", period: "day",
    earned: { ...fig({ jobs: 41, revenue: 184500, cost: 121300, margin: 63200, marginPct: 34.3 }), jobsWithoutPrice: 3, jobsWithoutCost: 6 },
    pipeline: { ...fig({ jobs: 23, revenue: 96400, cost: 50000, margin: 46400, marginPct: 48.1 }), jobsWithoutPrice: 0, jobsWithoutCost: 0 },
    series: [
      { period: "2026-10-18", start: "2026-10-18", earned: fig({ jobs: 2, revenue: 100000, cost: 60000, margin: 40000, marginPct: 40 }), pipeline: fig() },
      { period: "2026-10-19", start: "2026-10-19", earned: fig(), pipeline: fig() },
      { period: "2026-10-20", start: "2026-10-20", earned: fig(), pipeline: fig({ jobs: 1, revenue: 50000 }) },
    ],
    ...over,
  };
}

export const breakdownItem = (key: string | null, name: string | null, revenue: number, over: Partial<BreakdownItem> = {}): BreakdownItem =>
  ({ key, name, jobs: 2, revenue, cost: revenue / 2, margin: revenue / 2, marginPct: 50, ...over });

export function breakdownFixture(by: FinanceBreakdown["by"], items: BreakdownItem[], over: Partial<FinanceBreakdown> = {}): FinanceBreakdown {
  const sum = (k: "jobs" | "revenue" | "cost") => items.reduce((n, i) => n + i[k], 0);
  return {
    currency: "RON", by, basis: "completed", from: "2026-10-01", to: "2026-10-31", items,
    totals: fig({ jobs: sum("jobs"), revenue: sum("revenue"), cost: sum("cost"), margin: sum("revenue") - sum("cost"), marginPct: 50 }),
    total: items.length, limit: 500, offset: 0, hasMore: false, nextOffset: null, truncated: false, ...over,
  };
}

export const jobItem = (n: number, over: Partial<FinanceJobItem> = {}): FinanceJobItem => ({
  id: `job-${n}`, reference: `JOB-${n}`, title: `Job title ${n}`, status: "COMPLETED", kind: "EARNED",
  customer: { id: "c1", name: "Hotel Marina" }, jobType: { id: "t1", name: "Repair" }, completedAt: "2026-10-10T10:00:00Z", scheduledStart: null,
  price: 320000, cost: 190000, margin: 130000, marginPct: 40.6, teams: [], technicians: [], ...over,
});

export function jobsFixture(items: FinanceJobItem[], over: Partial<FinanceJobs> = {}): FinanceJobs {
  return {
    currency: "RON", basis: "completed", from: "2026-10-01", to: "2026-10-31",
    totals: fig({ jobs: items.length, revenue: 320000, cost: 190000, margin: 130000, marginPct: 40.6 }),
    items, total: items.length, limit: 50, offset: 0, hasMore: false, nextOffset: null, nextCursor: null, ...over,
  };
}

export const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
export const withQuery = (ui: ReactNode, qc: QueryClient = makeClient()) => <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
export const mountWithQuery = (ui: ReactNode, qc?: QueryClient) => render(withQuery(ui, qc));
