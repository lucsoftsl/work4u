"use client";

import { useCallback, useEffect, useState } from "react";
import { listNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "@/lib/notifications";
import { announceNotificationsChanged } from "@/hooks/useNotificationCount";

/** Feed state shared by the header panel and the /notifications page. */
export function useNotificationFeed(enabled: boolean, limit: number) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    listNotifications(limit)
      .then((r) => active && setItems(r.items))
      .catch(() => active && setError("load"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [enabled, limit, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const markRead = useCallback(async (n: AppNotification) => {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    try {
      await markNotificationRead(n.id);
      announceNotificationsChanged();
    } catch {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
    }
  }, []);

  const markAll = useCallback(async () => {
    setActionError(false);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      announceNotificationsChanged();
    } catch {
      setActionError(true);
    }
  }, []);

  return { items, loading, error, actionError, reload, markRead, markAll, unreadInList: items.filter((i) => !i.read).length };
}
