/** Run `fn` for every item with at most `limit` in flight (a burst of N writes becomes a steady trickle instead of N at once). */
export async function runLimited<T>(items: readonly T[], limit: number, fn: (item: T) => Promise<unknown>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item).catch(() => undefined); // callers handle their own errors
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
}
