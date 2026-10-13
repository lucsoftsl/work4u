import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OutboxSendError, createOutbox, outboxRetryDelay, type OutboxItem } from "./chat-outbox";

type Ack = { id: string; text?: string };

function setup(opts: { online?: boolean; send?: (item: OutboxItem) => Promise<Ack> } = {}) {
  let online = opts.online ?? true;
  let seq = 0;
  const changes: OutboxItem[][] = [];
  const acks: Array<[string, Ack]> = [];
  const send = vi.fn(opts.send ?? (async (item: OutboxItem) => ({ id: `srv-${item.clientId}`, text: item.text })));
  const outbox = createOutbox<Ack>({
    send,
    onAck: (clientId, ack) => acks.push([clientId, ack]),
    onChange: (items) => changes.push(items),
    isOnline: () => online,
    createId: () => `c${++seq}`,
    baseDelayMs: 1000,
    maxAutoAttempts: 3,
  });
  return { outbox, send, acks, changes, setOnline: (v: boolean) => (online = v), last: () => changes[changes.length - 1] ?? [] };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("chat outbox", () => {
  it("queues while disconnected and flushes on reconnect", async () => {
    const t = setup({ online: false });
    const id = t.outbox.enqueue({ toUserId: "w1", text: "hello" });

    await vi.runAllTimersAsync();
    expect(t.send).not.toHaveBeenCalled();
    expect(t.last()).toMatchObject([{ clientId: id, status: "queued", text: "hello" }]);

    t.setOnline(true);
    await t.outbox.flushNow();

    expect(t.send).toHaveBeenCalledTimes(1);
    expect(t.acks).toEqual([[id, { id: "srv-c1", text: "hello" }]]);
    expect(t.last()).toEqual([]);
  });

  it("retries transient failures with backoff and then delivers", async () => {
    const send = vi
      .fn<(item: OutboxItem) => Promise<Ack>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ id: "srv-1" });
    const t = setup({ send });
    t.outbox.enqueue({ toUserId: "w1", text: "after restart" });
    await vi.advanceTimersByTimeAsync(0);

    expect(t.last()[0]).toMatchObject({ status: "queued", attempts: 1, error: "Failed to fetch" });
    await vi.advanceTimersByTimeAsync(outboxRetryDelay(1));

    expect(send).toHaveBeenCalledTimes(2);
    expect(t.acks).toHaveLength(1);
    expect(t.last()).toEqual([]);
  });

  it("marks a message failed after the automatic attempts and lets the user retry", async () => {
    let fail = true;
    const t = setup({
      send: async (item) => {
        if (fail) throw new TypeError("Failed to fetch");
        return { id: `srv-${item.clientId}` };
      },
    });
    const id = t.outbox.enqueue({ toUserId: "w1", text: "x" });
    await vi.runAllTimersAsync();

    expect(t.send).toHaveBeenCalledTimes(3);
    expect(t.last()).toMatchObject([{ clientId: id, status: "failed", attempts: 3 }]);

    fail = false;
    t.outbox.retry(id);
    await vi.runAllTimersAsync();
    expect(t.acks.map(([c]) => c)).toEqual([id]);
    expect(t.last()).toEqual([]);
  });

  it("fails immediately on a non-retryable error (e.g. 400/404)", async () => {
    const t = setup({ send: async () => Promise.reject(new OutboxSendError("Recipient not found", false)) });
    t.outbox.enqueue({ toUserId: "nobody", text: "x" });
    await vi.runAllTimersAsync();
    expect(t.send).toHaveBeenCalledTimes(1);
    expect(t.last()[0]).toMatchObject({ status: "failed", error: "Recipient not found" });
  });

  it("never sends the same message twice when flushes overlap (dedupe on ack)", async () => {
    let resolve!: (ack: Ack) => void;
    const t = setup({ send: () => new Promise<Ack>((r) => (resolve = r)) });
    const id = t.outbox.enqueue({ toUserId: "w1", text: "once" });
    void t.outbox.flushNow();
    void t.outbox.flushNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.send).toHaveBeenCalledTimes(1);

    resolve({ id: "srv-1" });
    await vi.advanceTimersByTimeAsync(0);
    t.outbox.retry(id); // already acked: no-op
    await vi.runAllTimersAsync();
    expect(t.send).toHaveBeenCalledTimes(1);
    expect(t.acks).toHaveLength(1);
  });

  it("keeps conversation order: newer messages wait behind one that is retrying", async () => {
    const order: string[] = [];
    let first = true;
    const t = setup({
      send: async (item) => {
        if (item.text === "1" && first) {
          first = false;
          throw new TypeError("offline");
        }
        order.push(item.text ?? "");
        return { id: `srv-${item.text}` };
      },
    });
    t.outbox.enqueue({ toUserId: "w1", text: "1" });
    t.outbox.enqueue({ toUserId: "w1", text: "2" });
    await vi.runAllTimersAsync();
    expect(order).toEqual(["1", "2"]);
  });

  it("caps the retry delay", () => {
    expect([1, 2, 3, 4].map((a) => outboxRetryDelay(a))).toEqual([1000, 2000, 4000, 8000]);
    expect(outboxRetryDelay(10)).toBe(15000);
  });
});

describe("chat outbox persistence", () => {
  it("generates UUID client ids (the API validates them)", async () => {
    const { newClientId } = await import("./chat-outbox");
    expect(newClientId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newClientId()).not.toBe(newClientId());
  });

  it("restores queued/failed items after a reload and sends them with the SAME client id", async () => {
    const send = vi.fn(async (item: OutboxItem) => ({ id: `srv-${item.clientId}` }));
    const stored = [
      { clientId: "11111111-1111-4111-8111-111111111111", toUserId: "w1", text: "queued before close", status: "sending", attempts: 2, createdAt: "2026-10-12T10:00:00.000Z" },
      { clientId: "22222222-2222-4222-8222-222222222222", toUserId: "w1", text: "failed before close", status: "failed", attempts: 5, error: "offline", createdAt: "2026-10-12T10:01:00.000Z" },
      { clientId: 7, toUserId: "w1", text: "junk" },
    ];
    const acks: string[] = [];
    createOutbox<Ack>({ send, onAck: (c) => acks.push(c), onChange: () => {}, initialItems: stored as unknown as OutboxItem[] });
    await vi.runAllTimersAsync();

    // in-flight item is retried with its original id; the failed one waits for a manual retry
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].clientId).toBe("11111111-1111-4111-8111-111111111111");
    expect(acks).toEqual(["11111111-1111-4111-8111-111111111111"]);
  });

  it("saves and loads per user, clears when empty, and tolerates broken storage", async () => {
    const { loadOutbox, saveOutbox, outboxStorageKey } = await import("./chat-outbox-storage");
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
    const item: OutboxItem = { clientId: "c1", toUserId: "w1", text: "hi", createdAt: "2026-10-12T10:00:00.000Z", status: "queued", attempts: 0 };

    saveOutbox("u1", [item], storage);
    expect(loadOutbox("u1", storage)).toMatchObject([{ clientId: "c1", text: "hi", status: "queued" }]);
    expect(loadOutbox("u2", storage)).toEqual([]);
    saveOutbox("u1", [], storage);
    expect(data.has(outboxStorageKey("u1"))).toBe(false);
    data.set(outboxStorageKey("u1"), "{not json");
    expect(loadOutbox("u1", storage)).toEqual([]);
  });
});
