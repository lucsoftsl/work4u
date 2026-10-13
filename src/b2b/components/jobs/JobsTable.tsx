"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Job } from "@/b2b/api/types";
import { JobRef, StatusPill } from "@/b2b/components/StatusPill";
import { PAGE_SIZE, ariaSort, type JobSort, type SortDir } from "@/b2b/lib/job-filters";
import { FAMILY_CLASSES } from "@/b2b/lib/status";
import { ago, formatWindow } from "./format";

/** Optional fields some read models add; shown only if the API provides them. */
type JobRow = Job & { teamName?: string | null; assigneeName?: string | null };

const GRID = "lg:grid-cols-[96px_minmax(0,1fr)_150px_84px_170px_minmax(0,130px)_88px]";
const GRID_NO_TEAM = "lg:grid-cols-[96px_minmax(0,1fr)_150px_84px_170px_88px]";

function priorityCls(p?: string) {
  if (p === "URGENT") return FAMILY_CLASSES.vermilion.solid;
  if (p === "HIGH") return FAMILY_CLASSES.orange.tint;
  return "text-ops-ink-muted";
}
const cap = (s?: string) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "—");

interface Props {
  orgId: string;
  items: Job[];
  tz: string;
  sort: JobSort;
  dir: SortDir;
  nowMs: number;
  onSort: (sort: JobSort) => void;
}

function SortHeader({ k, label, sort, dir, onSort }: { k: JobSort; label: string; sort: JobSort; dir: SortDir; onSort: (s: JobSort) => void }) {
  const { t } = useTranslation();
  return (
    <span role="columnheader" aria-sort={ariaSort(k, { sort, dir })} className="font-bold">
      <button type="button" onClick={() => onSort(k)} aria-label={`${t("b2b.jobs.sortBy", "Sort by")} ${label}`} className="inline-flex min-h-[44px] items-center gap-1 font-bold hover:text-ops-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink">
        {label}
        {sort === k && (dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />)}
      </button>
    </span>
  );
}

export function JobsTable({ orgId, items, tz, sort, dir, nowMs, onSort }: Props) {
  const { t } = useTranslation();
  const rows = items as JobRow[]; // already sorted by the server
  const showTeam = rows.some((r) => r.teamName || r.assigneeName);
  const grid = showTeam ? GRID : GRID_NO_TEAM;
  return (
    <div role="table" aria-label={t("b2b.jobs.title", "Jobs")} className="overflow-hidden rounded-lg border border-ops-border bg-ops-surface">
      <div role="row" className={cn("hidden items-center gap-3 border-b border-ops-border bg-ops-canvas px-4 text-xs text-ops-ink-muted lg:grid", grid)}>
        <SortHeader sort={sort} dir={dir} onSort={onSort} k="number" label={t("b2b.jobs.col.ref", "Reference")} />
        <SortHeader sort={sort} dir={dir} onSort={onSort} k="title" label={t("b2b.jobs.col.job", "Job")} />
        <SortHeader sort={sort} dir={dir} onSort={onSort} k="status" label={t("b2b.jobs.col.status", "Status")} />
        <SortHeader sort={sort} dir={dir} onSort={onSort} k="priority" label={t("b2b.jobs.col.priority", "Priority")} />
        <SortHeader sort={sort} dir={dir} onSort={onSort} k="scheduledStart" label={t("b2b.jobs.col.schedule", "Schedule")} />
        {showTeam && <span role="columnheader" className="font-bold">{t("b2b.jobs.col.team", "Team")}</span>}
        <SortHeader sort={sort} dir={dir} onSort={onSort} k="updatedAt" label={t("b2b.jobs.col.updated", "Updated")} />
      </div>
      <div role="rowgroup" className="divide-y divide-ops-border">
        {rows.map((j) => (
          <div key={j.id} role="row">
            <div role="cell">
            <Link
              href={`/ops/${orgId}/jobs/${j.id}`}
              className={cn("grid min-h-[64px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ops-ink lg:gap-y-0", grid)}
            >
              <JobRef reference={j.reference} className="justify-self-start" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-ops-ink">{j.title}</span>
                {j.customerName && <span className="block truncate text-xs text-ops-ink-muted">{j.customerName}{j.locationLabel ? ` · ${j.locationLabel}` : ""}</span>}
              </span>
              <StatusPill status={j.status} className="justify-self-start" />
              <span className={cn("col-start-2 inline-flex h-6 w-fit items-center rounded px-1.5 text-xs font-bold lg:col-auto", priorityCls(j.priority))}>{cap(j.priority)}</span>
              <span className="col-span-2 text-xs text-ops-ink-muted lg:col-auto lg:text-sm lg:text-ops-ink">{formatWindow(j.scheduledStart, j.scheduledEnd, tz)}</span>
              {showTeam && <span className="truncate text-xs text-ops-ink lg:text-sm">{(j as JobRow).teamName ?? (j as JobRow).assigneeName ?? "—"}</span>}
              <span className="text-xs text-ops-ink-muted">{ago(Date.parse(j.updatedAt), nowMs)}</span>
            </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function JobsTableSkeleton() {
  return (
    <div role="status" aria-busy="true" className="overflow-hidden rounded-lg border border-ops-border bg-ops-surface">
      <span className="sr-only">Loading jobs</span>
      <ul className="divide-y divide-ops-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex min-h-[64px] items-center gap-3 px-4">
            <span className="h-6 w-20 animate-pulse rounded bg-ops-border motion-reduce:animate-none" />
            <span className="h-4 flex-1 animate-pulse rounded bg-ops-border motion-reduce:animate-none" />
            <span className="h-7 w-28 animate-pulse rounded bg-ops-border motion-reduce:animate-none" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export { PAGE_SIZE };
