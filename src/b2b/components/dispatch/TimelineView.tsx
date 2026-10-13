"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TIMELINE_END_H, TIMELINE_START_H, assignTracks, nowPercent, timelineBlock } from "@/b2b/lib/dispatch";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { JOB_STATUS_META, FAMILY_CLASSES } from "@/b2b/lib/status";
import type { DispatchBoard, Job } from "@/b2b/api/types";
import { LaneHeader, UnassignedColumn } from "./BoardView";
import { timeWindow } from "./JobCard";
import type { BoardViewProps } from "./types";

const HOURS = Array.from({ length: TIMELINE_END_H - TIMELINE_START_H + 1 }, (_, i) => TIMELINE_START_H + i);
const NOW_TICK_MS = 60_000;
const TRACK_PX = 52;
const ROW_PAD_PX = 8;
const LABEL_COL = "grid-cols-[180px_minmax(640px,1fr)]";

function Row({ name, header, jobs, orgId, timezone, nowPct }: { name: string; header: React.ReactNode; jobs: Job[]; orgId: string; timezone: string; nowPct: number | null }) {
  const { t } = useTranslation();
  const placed = jobs.map((job) => ({ job, block: timelineBlock(job, timezone) }));
  const off = placed.filter((p) => !p.block);
  const visible = placed.filter((p) => p.block);
  const tracks = assignTracks(visible.map((p) => p.block!));
  const trackCount = Math.max(1, ...tracks.map((x) => x + 1));
  return (
    <div role="row" aria-label={name} className={cn("grid border-t border-ops-border", LABEL_COL)}>
      <div className="p-2">{header}</div>
      <div className="relative min-h-[72px] border-l border-ops-border" style={{ minHeight: ROW_PAD_PX * 2 + trackCount * TRACK_PX + (off.length > 0 ? 20 : 0) }}>
        {nowPct !== null ? <span aria-hidden="true" data-testid="now-line" style={{ left: `${nowPct}%` }} className="pointer-events-none absolute inset-y-0 w-0.5 bg-sig-vermilion-ink" /> : null}
        {visible.map(({ job, block }, idx) => {
          const meta = JOB_STATUS_META[job.status];
          const StatusIcon = meta.icon;
          return (
            <Link
              key={job.id}
              href={`/ops/${orgId}/jobs/${job.id}`}
              style={{ left: `${block!.left}%`, width: `${block!.width}%`, top: ROW_PAD_PX + tracks[idx] * TRACK_PX }}
              className={cn("absolute min-h-[44px] overflow-hidden rounded border px-1.5 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-accent", FAMILY_CLASSES[meta.family].tint, "border-ops-border-strong")}
              title={`${job.reference} ${job.title} · ${meta.label} · ${timeWindow(job, timezone)}`}
            >
              <span className="block truncate font-mono font-bold">{job.reference}</span>
              <span className="block truncate">{job.title}</span>
              <span className="flex items-center gap-1 truncate font-bold"><StatusIcon className="h-3 w-3 shrink-0" aria-hidden="true" />{meta.label}</span>
            </Link>
          );
        })}
        {off.length > 0 ? (
          <p className="absolute bottom-1 left-2 text-xs text-ops-ink-muted">
            {off.length} {t("b2b.dispatch.outsideWindow", "outside 08:00–18:00 or unscheduled")}
          </p>
        ) : null}
        {jobs.length === 0 ? <p className="p-2 text-sm text-ops-ink-muted">{t("b2b.dispatch.noJobsDay", "No jobs this day")}</p> : null}
      </div>
    </div>
  );
}

/** Read-only day timeline. It scrolls inside its own container; assignment from here uses the Board view or "Assign to...". */
export function TimelineView({ board, orgId, timezone, canAssign, onAssignTo, date, nowMs }: BoardViewProps & { board: DispatchBoard; /** Viewed day (YYYY-MM-DD); the now line shows only when it is today. */ date?: string; nowMs?: number }) {
  const { t } = useTranslation();
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setClock(Date.now()), NOW_TICK_MS); return () => clearInterval(id); }, []);
  const now = nowMs ?? clock;
  const isToday = !!date && date === new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
  const nowPct = isToday ? nowPercent(now, timezone) : null;
  return (
    <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
      <UnassignedColumn board={board} orgId={orgId} timezone={timezone} canAssign={canAssign} onAssignTo={onAssignTo} />
      <div className="min-w-0 overflow-x-auto rounded border border-ops-border bg-ops-surface" role="table" aria-label={t("b2b.dispatch.timeline", "Timeline")}>
        <div className="min-w-[820px]">
          <div role="row" className={cn("grid", LABEL_COL)}>
            <div role="columnheader" className="p-2 text-xs font-bold uppercase tracking-wide text-ops-ink-muted">{t("b2b.dispatch.teamResource", "Team / resource")}</div>
            <div role="columnheader" className="relative h-8 border-l border-ops-border">
              {HOURS.map((h, i) => (
                <span key={h} style={{ left: `${(i / (HOURS.length - 1)) * 100}%` }} className="absolute top-1.5 -translate-x-1/2 font-mono text-xs text-ops-ink-muted first:translate-x-0 last:-translate-x-full">
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
          </div>
          {board.teams.map((team) => (
            <Row key={team.id} name={team.name} orgId={orgId} timezone={timezone} nowPct={nowPct} jobs={team.jobs} header={<LaneHeader name={team.name} status={team.status} jobs={team.jobs} capacity={team.capacity} />} />
          ))}
          {board.individuals.length > 0 ? (
            <Row name="Individuals" orgId={orgId} timezone={timezone} nowPct={nowPct} jobs={board.individuals} header={<LaneHeader name={t("b2b.dispatch.individuals", "Individuals")} jobs={board.individuals} />} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
