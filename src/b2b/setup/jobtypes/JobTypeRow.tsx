"use client";

import { ArchiveRestore, ArrowDown, ArrowUp, Archive, GripVertical, Pencil } from "lucide-react";
import type { DragEvent } from "react";
import type { JobType } from "@/b2b/api/jobTypes";
import { formatDuration } from "@/b2b/lib/job-form";
import { cn } from "@/lib/utils";
import { useTr } from "../i18n";

const ICON_BTN = "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded border border-ops-border-strong bg-ops-surface px-2 text-sm font-bold text-ops-ink hover:bg-ops-canvas disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent";

export interface DragProps {
  dragging: boolean;
  over: boolean;
  onDragStart: (e: DragEvent<HTMLLIElement>) => void;
  onDragOver: (e: DragEvent<HTMLLIElement>) => void;
  onDrop: (e: DragEvent<HTMLLIElement>) => void;
  onDragEnd: () => void;
}

interface Props {
  type: JobType;
  /** 0-based place among the active types, and how many there are (the arrows stop at the ends). */
  index: number;
  activeCount: number;
  manage: boolean;
  /** Formatted default price, or null to show none (no finance.view). */
  price: string | null;
  drag: DragProps;
  onMove: (delta: -1 | 1) => void;
  onRename: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

export function JobTypeRow({ type, index, activeCount, manage, price, drag, onMove, onRename, onArchive, onRestore }: Props) {
  const { tr, trn } = useTr();
  const jobs = trn("b2b.jobTypes.jobs", { one: "{n} job", other: "{n} jobs" }, type.jobCount);
  const meta = [type.defaultDurationMin ? formatDuration(type.defaultDurationMin) : null, price, jobs].filter(Boolean).join(" · ");
  const canDrag = manage && !type.archived;
  return (
    <li
      data-job-type={type.id}
      draggable={canDrag}
      onDragStart={canDrag ? drag.onDragStart : undefined}
      onDragOver={canDrag ? drag.onDragOver : undefined}
      onDrop={canDrag ? drag.onDrop : undefined}
      onDragEnd={drag.onDragEnd}
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5", type.archived && "bg-ops-canvas", drag.dragging && "opacity-50", drag.over && "shadow-[inset_0_3px_0_#005A8C]")}
    >
      {canDrag ? <GripVertical className="hidden h-5 w-5 shrink-0 cursor-grab text-ops-ink-subtle sm:block" aria-hidden="true" /> : <span className="hidden w-5 sm:block" aria-hidden="true" />}
      <div className="min-w-0 flex-1 basis-48">
        <p className="flex flex-wrap items-center gap-2 break-words text-sm font-bold text-ops-ink">
          <span className={type.archived ? "text-ops-ink-muted" : undefined}>{type.name}</span>
          {type.archived ? <span className="rounded border border-dashed border-ops-border-strong px-1.5 text-xs font-bold text-ops-ink-muted">{tr("b2b.jobTypes.archivedBadge", "Archived")}</span> : null}
        </p>
        <p className="text-xs text-ops-ink-muted">{meta}</p>
      </div>
      {manage ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {!type.archived ? (
            <>
              <button type="button" data-move={`${type.id}:up`} disabled={index === 0} onClick={() => onMove(-1)} aria-label={tr("b2b.jobTypes.moveUp", "Move {name} up", { name: type.name })} className={ICON_BTN}>
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" data-move={`${type.id}:down`} disabled={index === activeCount - 1} onClick={() => onMove(1)} aria-label={tr("b2b.jobTypes.moveDown", "Move {name} down", { name: type.name })} className={ICON_BTN}>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={onRename} aria-label={tr("b2b.jobTypes.renameNamed", "Rename {name}", { name: type.name })} className={ICON_BTN}>
                <Pencil className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">{tr("b2b.jobTypes.rename", "Rename")}</span>
              </button>
              <button type="button" onClick={onArchive} aria-label={tr("b2b.jobTypes.archiveNamed", "Archive {name}", { name: type.name })} className={ICON_BTN}>
                <Archive className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">{tr("b2b.jobTypes.archive", "Archive")}</span>
              </button>
            </>
          ) : (
            <button type="button" onClick={onRestore} aria-label={tr("b2b.jobTypes.restoreNamed", "Restore {name}", { name: type.name })} className={ICON_BTN}>
              <ArchiveRestore className="h-4 w-4" aria-hidden="true" /><span>{tr("b2b.jobTypes.restore", "Restore")}</span>
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}
