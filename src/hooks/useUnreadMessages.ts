"use client";

import { useChat } from "@/context/ChatContext";

/**
 * Unread message count for the header/tab badges. It reads the one shared poll owned by ChatProvider
 * (60 s, paused when hidden/offline, refetch on focus) instead of polling per component.
 */
export function useUnreadMessages(): number {
  return useChat().unreadCount;
}
