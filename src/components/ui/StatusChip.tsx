"use client";

import {
  AlertOctagon, Ban, Bookmark, CheckCircle2, CircleDot, ClipboardCheck, Clock, Eye, Handshake, Hourglass,
  Loader, Pause, Truck, Undo2, Wrench, XCircle, type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type ChipKind = "application" | "job" | "stage" | "availability";
type Tone = "primary" | "info" | "success" | "warning" | "danger" | "neutral";

const TONES: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-sunken text-ink-muted",
};

// Never colour alone: every status has an icon and a text label (design-tokens §5.2).
const MAP: Record<ChipKind, Record<string, { tone: Tone; icon: LucideIcon; labelKey: string }>> = {
  application: {
    PENDING: { tone: "info", icon: Clock, labelKey: "jobDetail.applicationStatus.PENDING" },
    VIEWED: { tone: "info", icon: Eye, labelKey: "jobDetail.applicationStatus.VIEWED" },
    SHORTLISTED: { tone: "primary", icon: Bookmark, labelKey: "jobDetail.applicationStatus.SHORTLISTED" },
    ACCEPTED: { tone: "success", icon: CheckCircle2, labelKey: "jobDetail.applicationStatus.ACCEPTED" },
    REJECTED: { tone: "danger", icon: XCircle, labelKey: "jobDetail.applicationStatus.REJECTED" },
    WITHDRAWN: { tone: "neutral", icon: Undo2, labelKey: "jobDetail.applicationStatus.WITHDRAWN" },
  },
  job: {
    OPEN: { tone: "primary", icon: CircleDot, labelKey: "status.job.OPEN" },
    IN_PROGRESS: { tone: "info", icon: Loader, labelKey: "status.job.IN_PROGRESS" },
    COMPLETED: { tone: "success", icon: CheckCircle2, labelKey: "status.job.COMPLETED" },
    CANCELLED: { tone: "neutral", icon: Ban, labelKey: "status.job.CANCELLED" },
    DISPUTED: { tone: "danger", icon: AlertOctagon, labelKey: "status.job.DISPUTED" },
    EXPIRED: { tone: "warning", icon: Hourglass, labelKey: "status.job.EXPIRED" },
  },
  stage: {
    HIRED: { tone: "primary", icon: Handshake, labelKey: "status.stage.HIRED" },
    EN_ROUTE: { tone: "info", icon: Truck, labelKey: "status.stage.EN_ROUTE" },
    STARTED: { tone: "info", icon: Wrench, labelKey: "status.stage.STARTED" },
    AWAITING_REVIEW: { tone: "warning", icon: ClipboardCheck, labelKey: "status.stage.AWAITING_REVIEW" },
  },
  availability: {
    AVAILABLE: { tone: "success", icon: CheckCircle2, labelKey: "status.availability.AVAILABLE" },
    BUSY: { tone: "warning", icon: Clock, labelKey: "status.availability.BUSY" },
    PAUSED: { tone: "neutral", icon: Pause, labelKey: "status.availability.PAUSED" },
  },
};

interface StatusChipProps {
  kind: ChipKind;
  value: string;
  /** Overrides the translated label. */
  label?: string;
  className?: string;
}

export function StatusChip({ kind, value, label, className }: StatusChipProps) {
  const { t } = useTranslation();
  const entry = MAP[kind][value] ?? { tone: "neutral" as Tone, icon: CircleDot, labelKey: "" };
  const Icon = entry.icon;
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-control px-2 text-caption font-bold", TONES[entry.tone], className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label ?? (entry.labelKey ? t(entry.labelKey) : value)}</span>
    </span>
  );
}

/** Unread / "new" counter, separate from status chips. */
export function CountBadge({ count, label, className }: { count: number; label: string; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={label}
      className={cn("inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ember px-1.5 text-micro text-on-fill tabular", className)}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
