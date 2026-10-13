"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchUnreadCount } from "@/lib/notifications";

const POLL_MS = 60_000;
const EVENT = "w4u:notifications-changed";

/** Tell every mounted bell to refetch (called after mark-read actions). */
export function announceNotificationsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** Unread notification count; polls every 60 s while the tab is visible (no websocket). */
export function useNotificationCount(): { count: number; refresh: () => void } {
  const { user } = useAuth();
  const userId = user?.id;
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      setCount(await fetchUnreadCount());
    } catch {
      // keep the last known value
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const tick = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener(EVENT, tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener(EVENT, tick);
    };
  }, [userId, load]);

  return { count: userId ? count : 0, refresh: () => void load() };
}
