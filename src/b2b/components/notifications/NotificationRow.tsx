"use client";

import Link from "next/link";
import type { NotificationItem } from "@/b2b/api/types";
import { JobRef } from "@/b2b/components/StatusPill";
import { notificationKind, relativeTime } from "@/b2b/lib/notifications";
import { cn } from "@/lib/utils";

interface Props { orgId: string; item: NotificationItem; onOpen: (item: NotificationItem) => void; compact?: boolean }

/** One notification: kind icon + text label (never icon alone), title/body, job link, relative time. */
export function NotificationRow({ orgId, item, onOpen, compact }: Props) {
  const { icon: Icon, label } = notificationKind(item.kind);
  const content = (
    <>
      <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded", item.read ? "bg-ops-canvas text-ops-ink-muted" : "bg-ops-ink text-white")}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-ops-ink-muted">
          <span className="font-bold">{label}</span>
          {item.jobReference ? <JobRef reference={item.jobReference} /> : null}
          <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
          {!item.read ? <span className="font-bold text-ops-ink">Unread</span> : null}
        </span>
        <span className={cn("block", item.read ? "font-medium" : "font-bold")}>{item.title}</span>
        {!compact && item.body ? <span className="block text-sm text-ops-ink-muted">{item.body}</span> : null}
      </span>
    </>
  );
  const cls = "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ops-accent";
  return item.jobId ? (
    <Link href={`/ops/${orgId}/jobs/${item.jobId}`} onClick={() => onOpen(item)} className={cls}>{content}</Link>
  ) : (
    <button type="button" onClick={() => onOpen(item)} className={cls}>{content}</button>
  );
}
