"use client";

import Link from "next/link";
import { AlertTriangle, Ban, Check, Inbox, Users, X, type LucideIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import {
  describeNotification,
  notificationHref,
  notificationText,
  type AppNotification,
  type NotificationIcon,
  type NotificationTone,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationIcon, LucideIcon> = { inbox: Inbox, check: Check, x: X, ban: Ban, alert: AlertTriangle, users: Users };
const TONES: Record<NotificationTone, string> = {
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

function timeAgo(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMin = Math.round((then - Date.now()) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  if (Math.abs(diffMin) < 1440) return rtf.format(Math.round(diffMin / 60), "hour");
  return rtf.format(Math.round(diffMin / 1440), "day");
}

interface Props {
  notification: AppNotification;
  onOpen: (n: AppNotification) => void;
  /** Called after navigation so the panel can close. */
  className?: string;
}

/** One row: icon + text (never colour only), unread marker with sr text, link when a destination exists. */
export function NotificationItem({ notification: n, onOpen, className }: Props) {
  const { t, locale } = useTranslation();
  const view = describeNotification(n);
  const Icon = ICONS[view.icon];
  const href = notificationHref(n);
  const text = notificationText(n, t);

  const body = (
    <>
      <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", TONES[view.tone])} aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        {view.urgent ? <span className="mb-0.5 block text-caption font-bold text-danger">{t("notif.needsAttention")}</span> : null}
        <span className={cn("block break-words text-label text-ink", !n.read && "font-bold")}>
          {!n.read ? <span className="sr-only">{t("notif.unread")}: </span> : null}
          {text}
        </span>
        <span className="mt-0.5 block text-caption text-ink-subtle">{timeAgo(n.createdAt, locale)}</span>
      </span>
      {!n.read ? <span aria-hidden="true" className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-ember" /> : null}
    </>
  );

  const cls = cn(
    "flex min-h-[44px] w-full items-start gap-3 rounded-control px-3 py-2.5 text-left hover:bg-sunken",
    !n.read && "bg-primary-soft/40",
    className
  );

  return href ? (
    <Link href={href} onClick={() => onOpen(n)} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={() => onOpen(n)} className={cls}>
      {body}
    </button>
  );
}
