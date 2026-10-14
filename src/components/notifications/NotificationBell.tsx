"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import { usePathname } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { badgeText, interpolate, type AppNotification } from "@/lib/notifications";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { useNotificationFeed } from "@/hooks/useNotificationFeed";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { Skeleton } from "@/components/ui/QueryState";

const FOCUSABLE = 'a[href], button:not([disabled])';
const PANEL_LIMIT = 8;

/** Header bell: unread badge + non-modal dialog listing recent notifications. */
export function NotificationBell() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { count } = useNotificationCount();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const feed = useNotificationFeed(open, PANEL_LIMIT);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Close on route change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close(false);
    };
    const onFocusIn = (e: FocusEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, close]);

  // Move focus into the panel once it opens.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const label = count > 0 ? interpolate(t("notif.unreadLabel"), { count: badgeText(count) }) : t("notif.bellLabel");

  const onOpenItem = (n: AppNotification) => {
    void feed.markRead(n);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="relative flex h-11 w-11 items-center justify-center rounded-control text-ink hover:bg-sunken"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {count > 0 ? (
          <span aria-hidden="true" className="absolute right-1 top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ember px-1 text-micro text-on-fill">
            {badgeText(count)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key !== "Tab") return;
            const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }}
          className="fixed inset-x-2 top-16 z-50 max-h-[80vh] overflow-y-auto rounded-card border border-line bg-surface p-2 shadow-raised focus:outline-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <h2 id={titleId} className="font-display text-h3 text-ink">{t("notif.title")}</h2>
            <button
              type="button"
              onClick={() => void feed.markAll()}
              disabled={feed.unreadInList === 0 && count === 0}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-control px-2 text-label font-bold text-primary hover:bg-sunken disabled:text-ink-subtle"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              {t("notif.markAllRead")}
            </button>
          </div>

          {feed.actionError ? <p role="alert" className="px-2 pb-1 text-caption text-danger">{t("notif.markError")}</p> : null}

          {feed.loading ? (
            <div role="status" aria-busy="true" className="space-y-2 p-2">
              <span className="sr-only">{t("common.loading")}</span>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : feed.error ? (
            <div role="alert" className="p-3">
              <p className="text-label text-ink">{t("notif.loadError")}</p>
              <button type="button" onClick={feed.reload} className="mt-2 min-h-[44px] rounded-control px-2 text-label font-bold text-primary hover:bg-sunken">
                {t("common.retry")}
              </button>
            </div>
          ) : feed.items.length === 0 ? (
            <p className="p-4 text-center text-label text-ink-muted">{t("notif.empty")}</p>
          ) : (
            <ul className="space-y-0.5">
              {feed.items.map((n) => (
                <li key={n.id}>
                  <NotificationItem notification={n} onOpen={onOpenItem} />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-1 border-t border-line pt-1">
            <Link href="/notifications" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center justify-center rounded-control text-label font-bold text-primary hover:bg-sunken">
              {t("notif.viewAll")}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
