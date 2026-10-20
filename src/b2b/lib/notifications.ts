import { fallback } from "./plural";
import { Bell, CalendarClock, CheckCircle2, RotateCcw, UserPlus, type LucideIcon } from "lucide-react";
import type { NotificationItem } from "@/b2b/api/types";

export interface KindMeta { icon: LucideIcon; label: string }

const KINDS: Record<string, KindMeta> = {
  "job.assigned": { icon: UserPlus, label: fallback("Assigned") },
  "job.rescheduled": { icon: CalendarClock, label: fallback("Rescheduled") },
  "job.review_requested": { icon: CheckCircle2, label: fallback("Review requested") },
  "job.sent_back": { icon: RotateCcw, label: fallback("Sent back") },
  "job.approved": { icon: CheckCircle2, label: fallback("Approved") },
};
const FALLBACK: KindMeta = { icon: Bell, label: fallback("Update") };

export function notificationKind(kind: string, t?: (key: string, fallback: string) => string): KindMeta {
  const meta = KINDS[kind] ?? FALLBACK;
  return t ? { ...meta, label: t(`b2b.notifications.kind.${KINDS[kind] ? kind : "other"}`, meta.label) } : meta;
}

/** The kinds that have a label, for the locale guard. */
export const NOTIFICATION_KINDS: ReadonlyArray<readonly [kind: string, label: string]> = [...Object.entries(KINDS).map(([k, v]) => [k, v.label] as const), ["other", FALLBACK.label]];

/** "5 min ago", "3 h ago", "2 d ago". */
export function relativeTime(iso: string, now: number = Date.now(), locale = "en"): string {
  const ms = now - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const min = Math.floor(ms / 60_000);
  if (locale !== "en") {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
    if (min < 1) return rtf.format(0, "minute");
    if (min < 60) return rtf.format(-min, "minute");
    if (min < 1440) return rtf.format(-Math.floor(min / 60), "hour");
    return rtf.format(-Math.floor(min / 1440), "day");
  }
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
export const bellLabel = (count: number, t: (key: string, fallback: string) => string = (_k, f) => f): string =>
  count > 0 ? t("b2b.notifications.bellUnread", "Notifications, {n} unread").replace("{n}", String(count)) : t("b2b.notifications.bell", "Notifications");

const UNREAD_POLL_MS = 120_000;
const UNREAD_POLL_LIVE_MS = 300_000;
/** Unread badge refresh: none while the tab is hidden or offline; relaxed when the realtime stream is live (focus refetch covers the rest). */
export function unreadRefetchInterval(s: { live: string; hidden: boolean; online: boolean }): number | false {
  if (s.hidden || !s.online) return false;
  return s.live === "live" ? UNREAD_POLL_LIVE_MS : UNREAD_POLL_MS;
}
