"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { isB2bError } from "@/b2b/api/client";
import { listNotifications, qk, unreadCount } from "@/b2b/api/endpoints";
import type { NotificationItem } from "@/b2b/api/types";
import { NotificationRow } from "@/b2b/components/notifications/NotificationRow";
import { useNotificationActions } from "@/b2b/components/notifications/useNotificationActions";
import { useOrg } from "@/b2b/context/OrgContext";
import { useOnline } from "@/b2b/offline/useOnline";
import { bellLabel, unreadBadge, unreadRefetchInterval } from "@/b2b/lib/notifications";

const LATEST = 5;
const FOCUSABLE = "a[href],button:not([disabled])";

/** Header bell: unread badge + popover (role=dialog) with the latest notifications. */
export function NotificationsBell({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { markOne, markAll } = useNotificationActions(orgId);

  // Unread count: one shared query. Refetches on window focus, and on a slow timer that stops while the tab is hidden or offline.
  const { live } = useOrg();
  const online = useOnline();
  const count = useQuery({
    queryKey: qk.notifications(orgId),
    queryFn: () => unreadCount(orgId),
    staleTime: 60_000,
    refetchInterval: () => unreadRefetchInterval({ live, hidden: typeof document !== "undefined" && document.visibilityState === "hidden", online }),
  });
  const latest = useQuery({
    queryKey: [...qk.notifications(orgId), "latest"],
    queryFn: () => listNotifications(orgId, { limit: LATEST }),
    enabled: open,
    retry: false,
  });

  const close = (restore: boolean) => { setOpen(false); if (restore) btnRef.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
      if (e.key === "Tab") {
        const els = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (!els || els.length === 0) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); btnRef.current?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); close(true); }
      }
    };
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !btnRef.current?.contains(target)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onPointer); };
  }, [open, latest.isSuccess]);

  if (count.isError && isB2bError(count.error) && count.error.isMigrationPending) return null;
  const n = count.data?.count ?? 0;
  const items: NotificationItem[] = latest.data?.items ?? [];
  const pending = latest.isError && isB2bError(latest.error) && latest.error.isMigrationPending;

  return (
    <div className="relative">
      <button ref={btnRef} type="button" aria-label={bellLabel(n, t)} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)} className="relative flex h-11 w-11 items-center justify-center rounded text-white hover:bg-white/10">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {n > 0 ? (
          <span aria-hidden="true" className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-sig-vermilion px-1 text-center text-[11px] font-bold leading-[18px] text-white">{unreadBadge(n)}</span>
        ) : null}
      </button>
      {open ? (
        <div ref={panelRef} id={panelId} role="dialog" aria-label={t("b2b.notifications.title", "Notifications")}
          className="fixed inset-x-2 top-16 z-50 max-h-[80vh] overflow-y-auto rounded border border-ops-border bg-ops-surface text-ops-ink shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1 sm:w-96">
          <div className="flex items-center justify-between border-b border-ops-border px-4 py-2">
            <h2 className="font-bold">{t("b2b.notifications.title", "Notifications")}</h2>
            <button type="button" disabled={n === 0 || markAll.isPending} onClick={() => markAll.mutate()} className="min-h-[44px] px-1 text-sm font-bold underline disabled:no-underline disabled:opacity-50">
              {t("b2b.notifications.markAll", "Mark all read")}
            </button>
          </div>
          {latest.isPending ? <p role="status" className="px-4 py-6 text-sm text-ops-ink-muted">{t("b2b.common.loading", "Loading")}</p>
            : pending ? <p className="px-4 py-6 text-sm text-ops-ink-muted">{t("b2b.notifications.unavailableTitle", "Notifications aren't available yet")}</p>
            : latest.isError ? <p role="alert" className="px-4 py-6 text-sm">{t("b2b.notifications.loadError", "Couldn't load notifications.")}</p>
            : items.length === 0 ? <p className="px-4 py-6 text-sm text-ops-ink-muted">{t("b2b.notifications.empty", "No notifications yet")}</p>
            : (
              <ul className="divide-y divide-ops-border">
                {items.map((it) => (
                  <li key={it.id} onClick={() => close(false)}>
                    <NotificationRow orgId={orgId} item={it} compact onOpen={(x) => { if (!x.read) markOne.mutate(x.id); }} />
                  </li>
                ))}
              </ul>
            )}
          <Link href={`/ops/${orgId}/notifications`} onClick={() => close(false)} className="block border-t border-ops-border px-4 py-3 text-center text-sm font-bold underline">
            {t("b2b.notifications.viewAll", "View all")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
