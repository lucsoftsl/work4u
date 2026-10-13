/** Sum of per-conversation unread counts from GET /api/messages/conversations; junk counts as 0. */
export function sumUnread(conversations: unknown): number {
  if (!Array.isArray(conversations)) return 0;
  return conversations.reduce((total: number, item) => {
    const n = Number((item as { unreadCount?: unknown })?.unreadCount ?? 0);
    return total + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}
