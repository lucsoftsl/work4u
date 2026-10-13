import { useSyncExternalStore } from "react";

/**
 * Whether a chat conversation is open. The mobile bottom tab bar hides while a thread is open
 * (the composer needs the space) but stays visible on the inbox list.
 */
let threadOpen = false;
const listeners = new Set<() => void>();

export function setChatThreadOpen(open: boolean): void {
  if (threadOpen === open) return;
  threadOpen = open;
  listeners.forEach((l) => l());
}

export function getChatThreadOpen(): boolean {
  return threadOpen;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useChatThreadOpen(): boolean {
  return useSyncExternalStore(subscribe, getChatThreadOpen, () => false);
}
