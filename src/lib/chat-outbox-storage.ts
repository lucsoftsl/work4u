import { restoreItems, type OutboxItem } from "@/lib/chat-outbox";

// Unsent chat messages survive a closed tab: stored per user in localStorage (small, text-only).
const KEY_PREFIX = "work4u_chat_outbox:";
const MAX_ITEMS = 50;

export const outboxStorageKey = (userId: string) => `${KEY_PREFIX}${userId}`;

export function loadOutbox(userId: string, storage: Pick<Storage, "getItem"> | null = safeStorage()): OutboxItem[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(outboxStorageKey(userId));
    return raw ? restoreItems(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveOutbox(userId: string, items: OutboxItem[], storage: Pick<Storage, "setItem" | "removeItem"> | null = safeStorage()): void {
  if (!storage) return;
  try {
    if (items.length === 0) storage.removeItem(outboxStorageKey(userId));
    else storage.setItem(outboxStorageKey(userId), JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    // storage full or blocked: the in-memory outbox still works
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
