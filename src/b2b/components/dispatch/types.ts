import type { ComponentType, CSSProperties, ReactNode, Ref } from "react";
import type { DispatchBoard, Job } from "@/b2b/api/types";
import type { LaneBadge } from "@/b2b/lib/dispatch";

export interface JobCardProps {
  job: Job;
  orgId: string;
  timezone: string;
  /** The viewer may pick this card up (permission + assignable status). */
  draggable: boolean;
  /** Opens the "Assign to..." dialog (non-drag alternative). Omitted when the viewer cannot assign. */
  onAssignTo?: (job: Job) => void;
  /** Drag handle node (dnd-aware board) or a same-size placeholder (static fallback). */
  handle?: ReactNode;
  rootRef?: Ref<HTMLLIElement>;
  rootStyle?: CSSProperties;
  isDragging?: boolean;
  /** Rendered inside DragOverlay: no link, no buttons. */
  overlay?: boolean;
}

export interface LaneProps {
  id: string;
  name: string;
  droppable: boolean;
  children: ReactNode;
  /** Header content (status chip, counts). */
  header: ReactNode;
  badge?: LaneBadge | null;
  isEmpty: boolean;
  className?: string;
}

export interface BoardViewProps {
  board: DispatchBoard;
  orgId: string;
  timezone: string;
  canAssign: boolean;
  onAssignTo?: (job: Job) => void;
  CardComponent?: ComponentType<JobCardProps>;
  LaneComponent?: ComponentType<LaneProps>;
  /** Tablet (md only): the single visible lane id ("unassigned", a team id or "individuals"). Undefined = show all. */
  activeLane?: string;
  /** A priority/skill filter is active (changes the wording of empty columns). */
  filtered?: boolean;
  /** Role capabilities for empty states. */
  caps?: import("@/b2b/lib/empty-states").EmptyCaps;
}
