import { Bell, CalendarClock, CheckCircle2, RotateCcw, UserPlus, type LucideIcon } from "lucide-react";
import type { NotificationItem } from "@/b2b/api/types";

export interface KindMeta { icon: LucideIcon; label: string }

const KINDS: Record<string, KindMeta> = {
  "job.assigned": { icon: UserPlus, label: "Assigned" },
  "job.rescheduled": { icon: CalendarClock, label: "Rescheduled" },
  "job.review_requested": { icon: CheckCircle2, label: "Review requested" },
  "job.sent_back": { icon: RotateCcw, label: "Sent back" },
  "job.approved": { icon: CheckCircle2, label: "Approved" },
};
const FALLBACK: KindMeta = { icon: Bell, label: "Update" };

export function notificationKind(kind: string): KindMeta {
  return KINDS[kind] ?? FALLBACK;
}

/** "5 min ago", "3 h ago", "2 d ago". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export function markReadLocally(items: readonly NotificationItem[], id: string | number): NotificationItem[] {
  return items.map((n) => (n.id === id && !n.read ? { ...n, read: true, readAt: new Date().toISOString() } : n));
}

export const unreadBadge = (count: number): string => (count > 99 ? "99+" : String(count));
export const bellLabel = (count: number): string => (count > 0 ? `Notifications, ${count} unread` : "Notifications");

const UNREAD_POLL_MS = 120_000;
const UNREAD_POLL_LIVE_MS = 300_000;
/** Unread badge refresh: none while the tab is hidden or offline; relaxed when the realtime stream is live (focus refetch covers the rest). */
export function unreadRefetchInterval(s: { live: string; hidden: boolean; online: boolean }): number | false {
  if (s.hidden || !s.online) return false;
  return s.live === "live" ? UNREAD_POLL_LIVE_MS : UNREAD_POLL_MS;
}
