import { apiJson } from "@/lib/http";

export interface AppNotification {
  id: string;
  type: string;
  kind: string | null;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export type NotificationTone = "info" | "success" | "warning" | "danger";
export type NotificationIcon = "inbox" | "check" | "x" | "ban" | "alert" | "users";

export interface NotificationView {
  /** Translation key; when null, show the server `message` fallback. */
  key: string | null;
  params: Record<string, string>;
  tone: NotificationTone;
  icon: NotificationIcon;
  /** Needs the recipient's attention (shown with an extra text label). */
  urgent: boolean;
}

export const BADGE_CAP = 9;

/** "9+" once the count exceeds the cap. */
export function badgeText(count: number): string {
  return count > BADGE_CAP ? `${BADGE_CAP}+` : String(Math.max(0, Math.floor(count) || 0));
}

const str = (v: unknown): string => (typeof v === "string" && v.trim() ? v.trim() : "");

/** B2C shows marketplace notifications only; XP/achievement rows have no kind. */
export function isB2cNotification(n: Pick<AppNotification, "kind">): boolean {
  return typeof n.kind === "string" && n.kind.length > 0;
}

export function describeNotification(n: Pick<AppNotification, "kind" | "data">): NotificationView {
  const data = n.data ?? {};
  const jobTitle = str(data.jobTitle);
  const params = { jobTitle };
  switch (n.kind) {
    case "APPLICATION_RECEIVED":
      return { key: jobTitle ? "notif.applicationReceived" : "notif.applicationReceivedNoTitle", params, tone: "info", icon: "inbox", urgent: false };
    case "APPLICATION_ACCEPTED":
      return { key: jobTitle ? "notif.applicationAccepted" : "notif.applicationAcceptedNoTitle", params, tone: "success", icon: "check", urgent: false };
    case "APPLICATION_REJECTED":
      return { key: jobTitle ? "notif.applicationRejected" : "notif.applicationRejectedNoTitle", params, tone: "warning", icon: "x", urgent: false };
    case "JOB_CANCELLED":
      return { key: jobTitle ? "notif.jobCancelled" : "notif.jobCancelledNoTitle", params, tone: "danger", icon: "ban", urgent: false };
    case "JOB_WORKER_LEFT": {
      if (str(data.reason) === "WITHDRAWN") {
        return { key: jobTitle ? "notif.workerWithdrew" : "notif.workerWithdrewNoTitle", params, tone: "danger", icon: "alert", urgent: true };
      }
      const key = str(data.outcome) === "CANCELLED" ? "notif.workerLeftCancelled" : "notif.workerLeftOpen";
      return { key, params, tone: "danger", icon: "alert", urgent: true };
    }
    case "COMPANY_ROSTER_INVITE":
      return { key: "notif.rosterInvite", params, tone: "info", icon: "users", urgent: false };
    case "COMPANY_ROSTER_ACCEPTED":
      return { key: "notif.rosterAccepted", params, tone: "success", icon: "users", urgent: false };
    case "COMPANY_ROSTER_DECLINED":
      return { key: "notif.rosterDeclined", params, tone: "warning", icon: "users", urgent: false };
    default:
      return { key: null, params, tone: "info", icon: "inbox", urgent: false };
  }
}

/** Where a notification leads; null when there is nowhere sensible to go. */
export function notificationHref(n: Pick<AppNotification, "kind" | "data">): string | null {
  const jobId = str(n.data?.jobId);
  switch (n.kind) {
    case "APPLICATION_RECEIVED":
    case "JOB_WORKER_LEFT":
      return jobId ? `/my-jobs/${encodeURIComponent(jobId)}/applicants` : null;
    case "APPLICATION_ACCEPTED":
    case "APPLICATION_REJECTED":
    case "JOB_CANCELLED":
      return jobId ? `/jobs/${encodeURIComponent(jobId)}` : null;
    default:
      return null;
  }
}

export function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => params[name] ?? "");
}

/** Final display text: translated by kind, falling back to the server's English message. */
export function notificationText(
  n: Pick<AppNotification, "kind" | "data" | "message">,
  t: (key: string) => string
): string {
  const view = describeNotification(n);
  if (!view.key) return n.message;
  return interpolate(t(view.key), view.params);
}

interface FeedResponse {
  items?: unknown;
  unreadCount?: unknown;
}

function cleanItems(raw: unknown): AppNotification[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is AppNotification => !!r && typeof r === "object" && typeof (r as AppNotification).id !== "undefined")
    .map((r) => ({ ...r, id: String(r.id), read: !!r.read, message: typeof r.message === "string" ? r.message : "" }))
    .filter(isB2cNotification);
}

const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export async function listNotifications(limit = 50): Promise<{ items: AppNotification[]; unreadCount: number }> {
  const body = await apiJson<FeedResponse>(`/api/me/notifications?limit=${limit}`, { auth: true, cache: "no-store" });
  return { items: cleanItems(body?.items), unreadCount: count(body?.unreadCount) };
}

export async function fetchUnreadCount(): Promise<number> {
  const body = await apiJson<{ unreadCount?: unknown }>("/api/me/notifications/unread-count", { auth: true, cache: "no-store" });
  return count(body?.unreadCount);
}

export async function markNotificationRead(id: string): Promise<number> {
  const body = await apiJson<{ unreadCount?: unknown }>(`/api/me/notifications/${encodeURIComponent(id)}/read`, { method: "POST", auth: true, json: {} });
  return count(body?.unreadCount);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiJson("/api/me/notifications/read-all", { method: "POST", auth: true, json: {} });
}
