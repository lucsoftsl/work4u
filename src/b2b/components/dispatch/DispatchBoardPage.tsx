"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { getBoard, qk } from "@/b2b/api/endpoints";
import { ck, listSkills } from "@/b2b/api/catalog";
import { useOrg } from "@/b2b/context/OrgContext";
import { RoleEmptyState } from "@/b2b/components/RoleEmptyState";
import { dayEmptyVariant, emptyCaps } from "@/b2b/lib/empty-states";
import { applyBoardFilters, boardFilterKey, boardQuery, boardSkillOptions, filterBoard, hasBoardFilters, laneTabs, parseBoardFilters, resolveActiveLane, type BoardFilters } from "@/b2b/lib/dispatch-view";
import { RequirePermission } from "@/b2b/components/shell/RequirePermission";
import { isIsoDate, shiftDate, todayInTimezone } from "@/b2b/lib/dispatch";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Job } from "@/b2b/api/types";
import { AssignDialogs, AssignToDialog } from "./AssignDialogs";
import { BoardFiltersBar } from "./BoardFiltersBar";
import { LaneSwitcher } from "./LaneSwitcher";
import { BoardSkeleton, BoardView } from "./BoardView";
import { TimelineView } from "./TimelineView";
import { useAssignFlow } from "./useAssignFlow";

// @dnd-kit stays out of the shared bundle: the static board is the loading fallback.
const DndBoard = dynamic(() => import("./DndBoard"), { ssr: false });

const NAV_BTN = "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded border border-ops-border-strong bg-ops-surface px-3 text-sm font-bold text-ops-ink hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-accent";
const TICK_MS = 5_000;

function LiveStatus({ live, updatedAt, refreshing }: { live: string; updatedAt: number; refreshing: boolean }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  const seconds = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
  const label = live === "live" ? t("b2b.dispatch.live", "Live") : live === "polling" ? t("b2b.dispatch.polling", "Updating") : t("b2b.dispatch.offline", "Offline");
  return (
    <p className="min-w-[10rem] text-xs text-ops-ink-muted" role="status">
      <span className="font-bold text-ops-ink">{label}</span>
      {seconds !== null ? ` · ${t("b2b.dispatch.updated", "updated")} ${seconds < 5 ? t("b2b.dispatch.justNow", "just now") : `${seconds}s ${t("b2b.dispatch.ago", "ago")}`}` : ""}
      {refreshing ? ` · ${t("b2b.dispatch.refreshing", "refreshing…")}` : ""}
    </p>
  );
}

function Content() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { orgId, me, can, live } = useOrg();
  const timezone = me?.org.timezone ?? "UTC";
  const today = useMemo(() => todayInTimezone(timezone), [timezone]);
  const rawDate = params.get("date");
  const date = isIsoDate(rawDate) ? rawDate : today;
  const view = params.get("view") === "timeline" ? "timeline" : "board";
  const canAssign = can("job.assign");
  const canOverride = can("dispatch.override_conflict");

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  const filters = useMemo(() => parseBoardFilters(new URLSearchParams(params.toString())), [params]);
  const filtersKey = useMemo(() => boardFilterKey(filters), [filters]);
  // Priority and skill filters are applied by the server (and part of the query key).
  const query = useQuery({
    queryKey: qk.board(orgId, date, filtersKey),
    queryFn: ({ signal }) => getBoard(orgId, date, boardQuery(filters), signal),
    placeholderData: keepPreviousData,
  });
  const board = query.data;
  const shownBoard = useMemo(() => (board ? filterBoard(board, filters) : undefined), [board, filters]);
  const skillsQuery = useQuery({ queryKey: ck.skills(orgId), queryFn: () => listSkills(orgId), staleTime: 60_000, retry: false });
  const skills = useMemo(
    () => (skillsQuery.data ? skillsQuery.data.map((s) => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name)) : board ? boardSkillOptions(board) : []),
    [skillsQuery.data, board]
  );
  const activeLane = useMemo(() => (board ? resolveActiveLane(params.get("team"), laneTabs(board)) : undefined), [board, params]);
  const caps = emptyCaps(can);
  const setFilters = useCallback(
    (f: BoardFilters) => router.replace(`${pathname}?${applyBoardFilters(new URLSearchParams(params.toString()), f).toString()}`, { scroll: false }),
    [params, pathname, router]
  );

  const flow = useAssignFlow({ orgId, date, canOverride, filtersKey });
  const [assignTo, setAssignTo] = useState<Job | null>(null);

  const total = board ? board.unassigned.length + board.individuals.length + board.teams.reduce((n, t2) => n + t2.jobs.length, 0) : 0;
  const common = { orgId, timezone, canAssign, onAssignTo: canAssign ? setAssignTo : undefined, caps, filtered: hasBoardFilters(filters), activeLane };

  return (
    <div className="space-y-3 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-xl font-bold text-ops-ink">{t("b2b.dispatch.title", "Dispatch")}</h1>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("b2b.dispatch.dateNav", "Choose day")}>
          <button type="button" className={NAV_BTN} onClick={() => setParams({ date: shiftDate(date, -1) })} aria-label={t("b2b.dispatch.prevDay", "Previous day")}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <label className="relative inline-flex min-h-[44px] items-center gap-2 rounded border border-ops-border-strong bg-ops-surface px-2 text-sm">
            <CalendarDays className="h-4 w-4 text-ops-ink-muted" aria-hidden="true" />
            <span className="sr-only">{t("b2b.dispatch.date", "Date")}</span>
            <input type="date" value={date} onChange={(e) => isIsoDate(e.target.value) && setParams({ date: e.target.value })} className="bg-transparent font-mono text-ops-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-accent" />
          </label>
          <button type="button" className={NAV_BTN} onClick={() => setParams({ date: shiftDate(date, 1) })} aria-label={t("b2b.dispatch.nextDay", "Next day")}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" className={NAV_BTN} disabled={date === today} onClick={() => setParams({ date: null })}>{t("b2b.dispatch.today", "Today")}</button>
        </div>
        <div role="group" aria-label={t("b2b.dispatch.view", "View")} className="flex">
          {(["board", "timeline"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setParams({ view: v === "board" ? null : v })}
              className={cn(NAV_BTN, "first:rounded-r-none last:rounded-l-none", view === v && "bg-ops-ink text-white hover:bg-ops-ink")}
            >
              {v === "board" ? t("b2b.dispatch.viewBoard", "Board") : t("b2b.dispatch.viewTimeline", "Timeline")}
            </button>
          ))}
        </div>
        <div className="ml-auto"><LiveStatus live={live} updatedAt={query.dataUpdatedAt} refreshing={query.isFetching} /></div>
      </div>

      {!board && query.isError ? (
        <div role="alert" className="flex flex-col items-start gap-2 rounded border border-ops-border bg-ops-surface p-4">
          <p className="text-sm text-ops-ink">{t("b2b.dispatch.loadError", "The dispatch board could not be loaded.")}</p>
          <button type="button" className={NAV_BTN} onClick={() => void query.refetch()}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("common.retry", "Try again")}</button>
        </div>
      ) : null}
      {board && query.isError ? (
        <p role="alert" className="text-sm text-sig-vermilion-ink">
          {t("b2b.dispatch.staleError", "Couldn't refresh. Showing the last loaded board.")}{" "}
          <button type="button" className="font-bold underline" onClick={() => void query.refetch()}>{t("common.retry", "Try again")}</button>
        </p>
      ) : null}
      {!board && !query.isError ? <BoardSkeleton /> : null}

      {board ? (
        <div aria-busy={query.isPlaceholderData}>
          {total === 0 && !hasBoardFilters(filters) ? (
            <div className="mb-3"><RoleEmptyState variant={dayEmptyVariant(caps)} orgId={orgId} /></div>
          ) : null}
          {total > 0 || hasBoardFilters(filters) ? (
            <div className="mb-3 space-y-3">
              <BoardFiltersBar filters={filters} skills={skills} onChange={setFilters} />
              <LaneSwitcher board={board} active={activeLane ?? "unassigned"} onSelect={(id) => setParams({ team: id })} />
            </div>
          ) : null}
          {view === "timeline" ? (
            <TimelineView board={shownBoard ?? board} {...common} date={date} />
          ) : canAssign ? (
            <DndBoard board={shownBoard ?? board} {...common} onDropOnTeam={(job, teamId) => void flow.requestAssign(job, teamId)} fetchCheck={flow.fetchCheck} />
          ) : (
            <BoardView board={shownBoard ?? board} {...common} />
          )}
        </div>
      ) : null}

      <AssignToDialog
        job={assignTo}
        board={board}
        fetchCheck={flow.fetchCheck}
        onClose={() => setAssignTo(null)}
        onPick={(job, teamId) => { setAssignTo(null); void flow.requestAssign(job, teamId); }}
      />
      <AssignDialogs orgId={orgId} dialog={flow.dialog} onClose={flow.closeDialog} onSubmitOverride={(r) => void flow.submitOverride(r)} onRetry={flow.retry} />
    </div>
  );
}

export function DispatchBoardPage() {
  return (
    <RequirePermission permission="dispatch.view">
      <Content />
    </RequirePermission>
  );
}
