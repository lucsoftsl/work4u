"use client";

import Link from "next/link";
import { AlertTriangle, CircleCheck, SearchX, ShieldAlert } from "lucide-react";
import { TEAM_STATUS_LABEL } from "@/b2b/lib/status";
import { canDragJob, teamHours, UNASSIGNED_LANE, type LaneBadge } from "@/b2b/lib/dispatch";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { DispatchBoard, Job, LaneCapacity } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { capacityView } from "@/b2b/lib/capacity";
import { EmptyState } from "@/b2b/components/EmptyState";
import { RoleEmptyState } from "@/b2b/components/RoleEmptyState";
import { noTeamsVariant } from "@/b2b/lib/empty-states";
import { INDIVIDUALS_LANE } from "@/b2b/lib/dispatch-view";
import { HandlePlaceholder, JobCard } from "./JobCard";
import type { BoardViewProps, JobCardProps, LaneProps } from "./types";

const LANE_MIN = "min-h-[220px]";
/** Tablet (md..lg) shows one lane at a time; the lane switcher picks it. */
const HIDE_AT_TABLET = "md:max-lg:hidden";

export function LaneBadgeView({ badge }: { badge: LaneBadge }) {
  const Icon = badge.tone === "fits" ? CircleCheck : badge.tone === "skill" ? ShieldAlert : AlertTriangle;
  const tone =
    badge.tone === "fits" ? "bg-sig-green-tint text-sig-green-ink"
    : badge.tone === "checking" ? "bg-ops-canvas text-ops-ink-muted"
    : "bg-sig-orange-tint text-sig-orange-ink";
  return (
    <p role="status" className={cn("flex items-start gap-1.5 rounded px-2 py-1 text-xs font-bold", tone)}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">{badge.text}</span>
    </p>
  );
}

export function StaticLane({ name, header, children, badge, isEmpty, className }: LaneProps) {
  const { t } = useTranslation();
  return (
    <section aria-label={name} className={cn("flex flex-col gap-2 rounded border border-ops-border bg-ops-canvas p-2", LANE_MIN, className)}>
      {header}
      {badge ? <LaneBadgeView badge={badge} /> : null}
      {isEmpty ? <p className="px-1 py-3 text-sm text-ops-ink-muted">{t("b2b.dispatch.noJobsDay", "No jobs this day")}</p> : <ul className="flex flex-col gap-2">{children}</ul>}
    </section>
  );
}

/** Utilization bar: text always says what the bar means (never colour alone). */
function CapacityMeter({ capacity }: { capacity: LaneCapacity }) {
  const { t } = useTranslation();
  const { orgId, can } = useOrg();
  const v = capacityView(capacity);
  const text = v.state === "not-working"
    ? t("b2b.dispatch.notWorking", "Not working")
    : t("b2b.dispatch.hoursBooked", "{booked} h of {total} h booked").replace("{booked}", v.bookedHours).replace("{total}", v.workingHours);
  const tone = v.state === "over" ? "bg-sig-vermilion-ink" : v.state === "full" ? "bg-sig-orange-ink" : "bg-ops-ink";
  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs text-ops-ink-muted">
        <span className="font-mono">{text}</span>
        {v.percent !== null ? <span className="font-mono font-bold text-ops-ink">{v.percent}%{v.state === "over" ? ` · ${t("b2b.dispatch.overBooked", "over-booked")}` : ""}</span> : null}
      </div>
      {v.percent !== null ? (
        <div role="progressbar" aria-label={text} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, v.percent)} className="h-1.5 overflow-hidden rounded bg-ops-border">
          <div className={cn("h-full rounded", tone)} style={{ width: `${v.fill}%` }} />
        </div>
      ) : null}
      {v.isDefault ? (
        <p className="text-xs text-ops-ink-muted" title={t("b2b.dispatch.defaultHours", "Default hours (Mon–Fri 09–17); set team hours to change")}>
          {t("b2b.dispatch.defaultHours", "Default hours (Mon–Fri 09–17); set team hours to change")}
          {can("team.manage") ? <> <Link href={`/ops/${encodeURIComponent(orgId)}/teams`} className="font-bold text-ops-ink underline">{t("b2b.dispatch.openTeams", "Open Teams")}</Link></> : null}
        </p>
      ) : null}
    </div>
  );
}

export function LaneHeader({ name, status, jobs, capacity }: { name: string; status?: Parameters<typeof statusLabel>[0]; jobs: Job[]; capacity?: LaneCapacity }) {
  const { t } = useTranslation();
  const hours = teamHours(jobs);
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-1">
      <h2 className="min-w-0 truncate text-sm font-bold text-ops-ink">{name}</h2>
      <div className="flex items-center gap-2 text-xs text-ops-ink-muted">
        {status ? <span className="rounded border border-ops-border-strong bg-ops-surface px-1.5 py-0.5 font-bold text-ops-ink">{statusLabel(status)}</span> : null}
        <span className="font-mono">
          {!capacity && hours.hasHours ? `${hours.hours} h · ` : ""}
          {hours.count} {hours.count === 1 ? t("b2b.dispatch.job", "job") : t("b2b.dispatch.jobs", "jobs")}
        </span>
      </div>
      {capacity ? <CapacityMeter capacity={capacity} /> : null}
    </header>
  );
}

function statusLabel(status: keyof typeof TEAM_STATUS_LABEL): string {
  return TEAM_STATUS_LABEL[status];
}

/** Static (non-draggable) card; reserves the handle width so the dnd upgrade does not shift the layout. */
export function StaticCard(props: JobCardProps) {
  return <JobCard {...props} handle={<HandlePlaceholder />} />;
}

export function UnassignedColumn({ board, className, ...rest }: { board: DispatchBoard; className?: string } & BoardCommon) {
  const { t } = useTranslation();
  const Card = rest.CardComponent ?? StaticCard;
  return (
    <section aria-label={t("b2b.dispatch.unassigned", "Unassigned")} className={cn("flex flex-col gap-2 rounded border border-ops-border-strong bg-ops-surface p-2 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto", className)}>
      <header className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ops-ink">{t("b2b.dispatch.unassigned", "Unassigned")}</h2>
        <span className="font-mono text-xs text-ops-ink-muted">{board.unassigned.length}</span>
      </header>
      {board.unassigned.length === 0 ? (
        <EmptyState
          icon={rest.filtered ? SearchX : CircleCheck}
          title={rest.filtered ? t("b2b.dispatch.noMatch", "No unassigned jobs match") : t("b2b.empty.all-assigned.title", "All caught up")}
          body={rest.filtered ? undefined : t("b2b.empty.all-assigned.body", "Every job has a team.")}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {board.unassigned.map((job) => (
            <Card key={job.id} job={job} orgId={rest.orgId} timezone={rest.timezone} draggable={canDragJob(job, rest.canAssign)} onAssignTo={rest.canAssign ? rest.onAssignTo : undefined} />
          ))}
        </ul>
      )}
    </section>
  );
}

type BoardCommon = Pick<BoardViewProps, "orgId" | "timezone" | "canAssign" | "onAssignTo" | "CardComponent" | "filtered">;

export function BoardView(props: BoardViewProps) {
  const { board, orgId, timezone, canAssign, onAssignTo } = props;
  const { t } = useTranslation();
  const Card = props.CardComponent ?? StaticCard;
  const Lane = props.LaneComponent ?? StaticLane;
  const hideUnless = (lane: string) => (props.activeLane && props.activeLane !== lane ? HIDE_AT_TABLET : undefined);
  const common = { orgId, timezone, canAssign, onAssignTo, CardComponent: props.CardComponent, filtered: props.filtered };

  const renderJobs = (jobs: Job[]) =>
    jobs.map((job) => (
      <Card key={job.id} job={job} orgId={orgId} timezone={timezone} draggable={canDragJob(job, canAssign)} onAssignTo={canAssign ? onAssignTo : undefined} />
    ));

  return (
    <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
      <UnassignedColumn board={board} {...common} className={hideUnless(UNASSIGNED_LANE)} />
      <div className="grid content-start gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {board.teams.length === 0 && board.individuals.length === 0 ? (
          <div className="lg:col-span-2 2xl:col-span-3">
            <RoleEmptyState variant={noTeamsVariant(props.caps ?? { canCreateJob: false, canManageTeams: false })} orgId={orgId} />
          </div>
        ) : null}
        {board.teams.map((team) => (
          <Lane key={team.id} className={hideUnless(team.id)} id={team.id} name={team.name} droppable={canAssign} isEmpty={team.jobs.length === 0} header={<LaneHeader name={team.name} status={team.status} jobs={team.jobs} capacity={team.capacity} />}>
            {renderJobs(team.jobs)}
          </Lane>
        ))}
        {board.individuals.length > 0 ? (
          <Lane className={hideUnless(INDIVIDUALS_LANE)} id={INDIVIDUALS_LANE} name={t("b2b.dispatch.individuals", "Individuals")} droppable={false} isEmpty={false} header={<LaneHeader name={t("b2b.dispatch.individuals", "Individuals")} jobs={board.individuals} />}>
            {renderJobs(board.individuals)}
          </Lane>
        ) : null}
      </div>
    </div>
  );
}

export { UNASSIGNED_LANE };

/** Same geometry as the board: used before the first response arrives. */
export function BoardSkeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
      <span className="sr-only">{t("b2b.dispatch.loading", "Loading dispatch board")}</span>
      <div aria-hidden="true" className="min-h-[360px] rounded border border-ops-border-strong bg-ops-surface p-2">
        {[0, 1, 2].map((i) => <div key={i} className="mb-2 h-[88px] animate-pulse rounded bg-ops-border motion-reduce:animate-none" />)}
      </div>
      <div aria-hidden="true" className="grid content-start gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn("rounded border border-ops-border bg-ops-canvas p-2", LANE_MIN)}>
            <div className="mb-2 h-5 w-1/2 animate-pulse rounded bg-ops-border motion-reduce:animate-none" />
            <div className="h-[88px] animate-pulse rounded bg-ops-border motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
