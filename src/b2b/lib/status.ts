import {
  CalendarCheck, CalendarPlus, CircleCheck, CircleDashed, CircleSlash, ClipboardCheck, Lock, MapPinCheck, OctagonAlert,
  PackageSearch, PencilRuler, Send, Truck, Wrench, type LucideIcon,
} from "lucide-react";
import type { JobStatus, TeamStatus } from "@/b2b/api/types";

// Status presentation (b2b/ux-direction.md §2.3): family colour + treatment + icon + label. Never colour alone.
export type Family = "slate" | "orange" | "blue" | "sky" | "green" | "vermilion" | "purple";
export type Treatment = "outline" | "tint" | "solid";

export interface StatusMeta { label: string; family: Family; treatment: Treatment; icon: LucideIcon }

export const JOB_STATUS_META: Record<JobStatus, StatusMeta> = {
  NEW: { label: "New", family: "slate", treatment: "outline", icon: CircleDashed },
  PLANNING: { label: "Planning", family: "slate", treatment: "tint", icon: PencilRuler },
  WAITING_FOR_PARTS: { label: "Waiting for parts", family: "orange", treatment: "tint", icon: PackageSearch },
  READY_TO_SCHEDULE: { label: "Ready to schedule", family: "blue", treatment: "outline", icon: CalendarPlus },
  SCHEDULED: { label: "Scheduled", family: "blue", treatment: "tint", icon: CalendarCheck },
  DISPATCHED: { label: "Team dispatched", family: "blue", treatment: "tint", icon: Send },
  EN_ROUTE: { label: "En route", family: "sky", treatment: "tint", icon: Truck },
  ON_SITE: { label: "On site", family: "sky", treatment: "tint", icon: MapPinCheck },
  IN_PROGRESS: { label: "In progress", family: "sky", treatment: "tint", icon: Wrench },
  BLOCKED: { label: "Blocked", family: "vermilion", treatment: "solid", icon: OctagonAlert },
  COMPLETED: { label: "Completed", family: "green", treatment: "tint", icon: CircleCheck },
  REVIEW: { label: "In review", family: "purple", treatment: "tint", icon: ClipboardCheck },
  CLOSED: { label: "Closed", family: "slate", treatment: "tint", icon: Lock },
  CANCELLED: { label: "Cancelled", family: "slate", treatment: "outline", icon: CircleSlash },
};

export const TEAM_STATUS_LABEL: Record<TeamStatus, string> = {
  AVAILABLE: "Available", ASSIGNED: "Assigned", TRAVELLING: "Travelling", ON_SITE: "On site", BREAK: "Break", OFFLINE: "Offline",
};

/** Tailwind classes per family + treatment (text on tint/white uses the family `ink`, solid uses white on `ink`). */
export const FAMILY_CLASSES: Record<Family, Record<Treatment, string>> = {
  slate: { outline: "border border-sig-slate-ink text-sig-slate-ink bg-ops-surface", tint: "bg-sig-slate-tint text-sig-slate-ink", solid: "bg-sig-slate-ink text-white" },
  orange: { outline: "border border-sig-orange-ink text-sig-orange-ink bg-ops-surface", tint: "bg-sig-orange-tint text-sig-orange-ink", solid: "bg-sig-orange-ink text-white" },
  blue: { outline: "border border-sig-blue-ink text-sig-blue-ink bg-ops-surface", tint: "bg-sig-blue-tint text-sig-blue-ink", solid: "bg-sig-blue-ink text-white" },
  sky: { outline: "border border-sig-sky-ink text-sig-sky-ink bg-ops-surface", tint: "bg-sig-sky-tint text-sig-sky-ink", solid: "bg-sig-sky-ink text-white" },
  green: { outline: "border border-sig-green-ink text-sig-green-ink bg-ops-surface", tint: "bg-sig-green-tint text-sig-green-ink", solid: "bg-sig-green-ink text-white" },
  vermilion: { outline: "border border-sig-vermilion-ink text-sig-vermilion-ink bg-ops-surface", tint: "bg-sig-vermilion-tint text-sig-vermilion-ink", solid: "bg-sig-vermilion-ink text-white" },
  purple: { outline: "border border-sig-purple-ink text-sig-purple-ink bg-ops-surface", tint: "bg-sig-purple-tint text-sig-purple-ink", solid: "bg-sig-purple-ink text-white" },
};

/** Dashboard buckets (spec §2) → which statuses they count. */
export const LIVE_STATUSES: JobStatus[] = ["DISPATCHED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "BLOCKED"];
export const OPEN_STATUSES: JobStatus[] = ["NEW", "PLANNING", "WAITING_FOR_PARTS", "READY_TO_SCHEDULE", "SCHEDULED", "DISPATCHED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "BLOCKED"];
export const TERMINAL_STATUSES: JobStatus[] = ["CLOSED", "CANCELLED"];
