"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { isB2bError } from "@/b2b/api/client";
import { listNotifications, qk } from "@/b2b/api/endpoints";
import type { NotificationItem } from "@/b2b/api/types";
import { EmptyState } from "@/b2b/components/EmptyState";
import { btnClass, ErrorRetry, Skeleton } from "@/b2b/components/workspace/ui";
import { useOrg } from "@/b2b/context/OrgContext";
import { NotificationRow } from "./NotificationRow";
import { useNotificationActions } from "./useNotificationActions";

const PAGE = 30;

export function NotificationsView() {
  const { orgId } = useOrg();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const unreadOnly = useSearchParams().get("unread") === "1";
  const { markOne, markAll } = useNotificationActions(orgId);

  const q = useInfiniteQuery({
    queryKey: [...qk.notifications(orgId), "list", unreadOnly],
    initialPageParam: undefined as string | number | undefined,
    queryFn: ({ pageParam }) => listNotifications(orgId, { unread: unreadOnly || undefined, before: pageParam, limit: PAGE }),
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    retry: (n, e) => !(isB2bError(e) && e.isMigrationPending) && n < 2,
  });

  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const unread = q.data?.pages[0]?.unreadCount ?? 0;
  const setFilter = (on: boolean) => router.replace(on ? `${pathname}?unread=1` : pathname);
  const open = (n: NotificationItem) => { if (!n.read) markOne.mutate(n.id); };

  if (q.isError && isB2bError(q.error) && q.error.isMigrationPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <h1 className="font-display text-2xl font-bold">{t("b2b.notifications.title", "Notifications")}</h1>
        <EmptyState icon={BellOff} title={t("b2b.notifications.unavailableTitle", "Notifications aren't available yet")}
          body={t("b2b.notifications.unavailableBody", "This feature is being set up for your workspace. Check back soon.")} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{t("b2b.notifications.title", "Notifications")}</h1>
        <button type="button" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()} className={btnClass("secondary")}>
          <CheckCheck className="h-4 w-4" aria-hidden="true" />{t("b2b.notifications.markAll", "Mark all read")}
        </button>
      </header>

      <div role="group" aria-label={t("b2b.notifications.filter", "Filter")} className="flex gap-2">
        {[false, true].map((on) => (
          <button key={String(on)} type="button" aria-pressed={unreadOnly === on} onClick={() => setFilter(on)}
            className={btnClass(unreadOnly === on ? "primary" : "secondary")}>
            {on ? `${t("b2b.notifications.unread", "Unread")}${unread ? ` (${unread})` : ""}` : t("b2b.notifications.all", "All")}
          </button>
        ))}
      </div>
      {markAll.isError ? <p role="alert" className="text-sm text-sig-vermilion-ink">{t("b2b.notifications.markFailed", "Couldn't mark notifications as read. Try again.")}</p> : null}

      {q.isPending ? (
        <div role="status" aria-busy="true" className="space-y-2"><span className="sr-only">{t("b2b.common.loading", "Loading")}</span><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : q.isError ? (
        <ErrorRetry message={t("b2b.notifications.loadError", "Couldn't load notifications.")} onRetry={() => void q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title={unreadOnly ? t("b2b.notifications.noUnread", "You're all caught up") : t("b2b.notifications.empty", "No notifications yet")}
          body={t("b2b.notifications.emptyBody", "You'll be told when jobs are assigned to you, rescheduled, or need your review.")} />
      ) : (
        <ul className="divide-y divide-ops-border overflow-hidden rounded border border-ops-border bg-ops-surface">
          {items.map((n) => <li key={n.id}><NotificationRow orgId={orgId} item={n} onOpen={open} /></li>)}
        </ul>
      )}

      {q.hasNextPage ? (
        <div className="flex justify-center">
          <button type="button" disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()} className={btnClass("secondary")}>
            {q.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            {t("b2b.notifications.loadMore", "Load more")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
