"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type Announcements, type DragEndEvent, type DragOverEvent, type DragStartEvent, type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { ConflictCheck, Job } from "@/b2b/api/types";
import { checkCacheKey, findJob, laneBadge, laneOfJob, type LaneBadge } from "@/b2b/lib/dispatch";
import { cn } from "@/lib/utils";
import { BoardView, LaneBadgeView } from "./BoardView";
import { DragHandleButton, JobCard } from "./JobCard";
import type { BoardViewProps, JobCardProps, LaneProps } from "./types";

// dnd-kit lives only in this file; the page loads it with next/dynamic so it stays out of the shared bundle.

const HOVER_DEBOUNCE_MS = 250;
const ARROWS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

const BadgeContext = createContext<{ laneId: string | null; badge: LaneBadge | null }>({ laneId: null, badge: null });

function DraggableCard(props: JobCardProps) {
  const { job, draggable } = props;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    disabled: !draggable,
    data: { reference: job.reference },
  });
  return (
    <JobCard
      {...props}
      rootRef={setNodeRef}
      rootStyle={{ transform: CSS.Translate.toString(transform) }}
      isDragging={isDragging}
      handle={<DragHandleButton reference={job.reference} {...attributes} {...listeners} />}
    />
  );
}

function DroppableLane({ id, name, droppable, header, children, isEmpty, className }: LaneProps) {
  const { setNodeRef, isOver, active } = useDroppable({ id, disabled: !droppable, data: { name } });
  const hover = useContext(BadgeContext);
  const badge = hover.laneId === id ? hover.badge : null;
  return (
    <section
      ref={setNodeRef}
      aria-label={name}
      className={cn(
        "flex min-h-[220px] flex-col gap-2 rounded border bg-ops-canvas p-2",
        className,
        isOver && droppable ? "border-2 border-ops-accent" : "border-ops-border",
        active && droppable && !isOver && "border-dashed border-ops-border-strong"
      )}
    >
      {header}
      {badge ? <LaneBadgeView badge={badge} /> : null}
      {isEmpty ? <p className="px-1 py-3 text-sm text-ops-ink-muted">No jobs this day</p> : <ul className="flex flex-col gap-2">{children}</ul>}
    </section>
  );
}

/** Arrow keys jump to the nearest lane in that direction (default dnd-kit steps 25px, useless here). */
const laneCoordinateGetter: KeyboardCoordinateGetter = (event, { context: { active, droppableRects, droppableContainers, collisionRect } }) => {
  if (!ARROWS.includes(event.code)) return undefined;
  event.preventDefault();
  if (!active || !collisionRect) return undefined;
  const cx = collisionRect.left + collisionRect.width / 2;
  const cy = collisionRect.top + collisionRect.height / 2;
  let best: { x: number; y: number; dist: number } | null = null;
  for (const container of droppableContainers.getEnabled()) {
    const rect = droppableRects.get(container.id);
    if (!rect) continue;
    const lx = rect.left + rect.width / 2;
    const ly = rect.top + rect.height / 2;
    const dx = lx - cx;
    const dy = ly - cy;
    const inDirection =
      (event.code === "ArrowRight" && dx > 8) || (event.code === "ArrowLeft" && dx < -8) ||
      (event.code === "ArrowDown" && dy > 8 && Math.abs(dy) >= Math.abs(dx) * 0.3) || (event.code === "ArrowUp" && dy < -8 && Math.abs(dy) >= Math.abs(dx) * 0.3);
    if (!inDirection) continue;
    const dist = Math.hypot(dx, dy);
    if (!best || dist < best.dist) best = { x: lx - collisionRect.width / 2, y: ly - collisionRect.height / 2, dist };
  }
  return best ? { x: best.x, y: best.y } : undefined;
};

interface DndBoardProps extends Omit<BoardViewProps, "CardComponent" | "LaneComponent"> {
  onDropOnTeam: (job: Job, teamId: string) => void;
  fetchCheck: (jobId: string, teamId: string) => Promise<ConflictCheck>;
}

export default function DndBoard({ onDropOnTeam, fetchCheck, ...view }: DndBoardProps) {
  const { board } = view;
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [hover, setHover] = useState<{ laneId: string | null; badge: LaneBadge | null }>({ laneId: null, badge: null });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cache = useRef(new Map<string, ConflictCheck>());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: laneCoordinateGetter })
  );

  const clearHover = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHover({ laneId: null, badge: null });
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const laneName = useCallback((id: unknown) => board.teams.find((t) => t.id === id)?.name, [board.teams]);
  const refOf = useCallback((id: unknown) => findJob(board, String(id))?.reference ?? "job", [board]);

  const announcements: Announcements = useMemo(
    () => ({
      onDragStart: ({ active }) => `Picked up ${refOf(active.id)}. Use arrow keys to move between teams.`,
      onDragOver: ({ active, over }) => (over ? `${refOf(active.id)} is over ${laneName(over.id) ?? "a lane"}.` : `${refOf(active.id)} is not over a team.`),
      onDragEnd: ({ active, over }) => (over && laneName(over.id) ? `Dropped ${refOf(active.id)} on ${laneName(over.id)}.` : `${refOf(active.id)} was dropped. No change.`),
      onDragCancel: ({ active }) => `Cancelled. ${refOf(active.id)} was not moved.`,
    }),
    [refOf, laneName]
  );

  const onDragStart = (e: DragStartEvent) => setActiveJob(findJob(board, String(e.active.id)) ?? null);

  const onDragOver = (e: DragOverEvent) => {
    if (timer.current) clearTimeout(timer.current);
    const jobId = String(e.active.id);
    const laneId = e.over ? String(e.over.id) : null;
    if (!laneId || !laneName(laneId) || laneId === laneOfJob(board, jobId)) {
      setHover({ laneId: null, badge: null });
      return;
    }
    const key = checkCacheKey(jobId, laneId);
    const cached = cache.current.get(key);
    setHover({ laneId, badge: laneBadge(cached ?? null) });
    if (cached) return;
    timer.current = setTimeout(() => {
      fetchCheck(jobId, laneId)
        .then((check) => {
          cache.current.set(key, check);
          setHover((h) => (h.laneId === laneId ? { laneId, badge: laneBadge(check) } : h));
        })
        .catch(() => setHover((h) => (h.laneId === laneId ? { laneId, badge: { tone: "checking", text: "Couldn't check availability" } } : h)));
    }, HOVER_DEBOUNCE_MS);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const job = findJob(board, String(e.active.id));
    const laneId = e.over ? String(e.over.id) : null;
    setActiveJob(null);
    clearHover();
    if (job && laneId && laneName(laneId)) onDropOnTeam(job, laneId);
  };

  const onDragCancel = () => { setActiveJob(null); clearHover(); };

  return (
    <DndContext
      sensors={sensors}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: "To pick up a job, press space or enter. Use the arrow keys to move between teams, space or enter to drop, escape to cancel.",
        },
      }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <BadgeContext.Provider value={hover}>
        <BoardView {...view} CardComponent={DraggableCard} LaneComponent={DroppableLane} />
      </BadgeContext.Provider>
      <DragOverlay dropAnimation={null}>
        {activeJob ? (
          <ul>
            <JobCard job={activeJob} orgId={view.orgId} timezone={view.timezone} draggable={false} overlay />
          </ul>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
