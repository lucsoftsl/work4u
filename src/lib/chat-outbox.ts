// Outgoing chat messages. Each message gets a client id and stays in the outbox until the
// server acknowledges it (HTTP 2xx returning the saved message). Network errors, 5xx and 429
// are retried with backoff; validation errors (other 4xx) fail at once. Failed messages
// stay visible with a manual retry. Pure TypeScript (no React) so it can be unit-tested.

export type OutboxStatus = "queued" | "sending" | "failed";

export interface OutboxPayload {
  toUserId: string;
  text?: string;
  imageUrl?: string;
  jobData?: { id?: string; title?: string };
}

export interface OutboxItem extends OutboxPayload {
  clientId: string;
  createdAt: string;
  status: OutboxStatus;
  attempts: number;
  error?: string;
}

/** Thrown by `send` to classify a failure. */
export class OutboxSendError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "OutboxSendError";
    this.retryable = retryable;
  }
}

export interface OutboxOptions<TAck> {
  /** Delivers one message; resolves with the server's saved message (the ack). */
  send: (item: OutboxItem) => Promise<TAck>;
  onAck: (clientId: string, ack: TAck) => void;
  onChange: (items: OutboxItem[]) => void;
  isOnline?: () => boolean;
  maxAutoAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  now?: () => Date;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  createId?: () => string;
  /** Items restored from storage (queued/failed); "sending" is treated as queued, since the tab died mid-send. */
  initialItems?: OutboxItem[];
}

export const OUTBOX_MAX_AUTO_ATTEMPTS = 5;

export function outboxRetryDelay(attempt: number, baseMs = 1_000, maxMs = 15_000): number {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
}

/** RFC 4122 v4 UUID: the API requires `clientId` to be a UUID (idempotent sends). */
export function newClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const hex = (n: number) => Math.floor(Math.random() * n).toString(16);
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => (c === "x" ? hex(16) : ((Math.random() * 4) | 8).toString(16)));
}

/** Keeps only well-formed persisted items; anything in flight when the tab closed becomes queued again. */
export function restoreItems(raw: unknown): OutboxItem[] {
  if (!Array.isArray(raw)) return [];
  const items: OutboxItem[] = [];
  for (const entry of raw) {
    const e = entry as Partial<OutboxItem> | null;
    if (!e || typeof e.clientId !== "string" || typeof e.toUserId !== "string" || (!e.text && !e.imageUrl)) continue;
    items.push({
      clientId: e.clientId,
      toUserId: e.toUserId,
      text: e.text,
      imageUrl: e.imageUrl,
      jobData: e.jobData,
      createdAt: typeof e.createdAt === "string" ? e.createdAt : new Date().toISOString(),
      status: e.status === "failed" ? "failed" : "queued",
      attempts: e.status === "failed" ? e.attempts ?? 0 : 0,
      error: e.status === "failed" ? e.error : undefined,
    });
  }
  return items;
}

export function createOutbox<TAck>(options: OutboxOptions<TAck>) {
  const {
    send,
    onAck,
    onChange,
    isOnline = () => true,
    maxAutoAttempts = OUTBOX_MAX_AUTO_ATTEMPTS,
    baseDelayMs = 1_000,
    maxDelayMs = 15_000,
    now = () => new Date(),
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    createId = newClientId,
    initialItems = [],
  } = options;

  let items: OutboxItem[] = restoreItems(initialItems);
  let flushing = false;
  let timer: unknown = null;
  let disposed = false;

  const emit = () => onChange(items.map((item) => ({ ...item })));
  const update = (clientId: string, patch: Partial<OutboxItem>) => {
    items = items.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item));
    emit();
  };
  const remove = (clientId: string) => {
    items = items.filter((item) => item.clientId !== clientId);
    emit();
  };

  const schedule = (delayMs: number) => {
    if (disposed || timer !== null) return;
    timer = setTimer(() => {
      timer = null;
      void flush();
    }, delayMs);
  };

  async function flush(): Promise<void> {
    if (disposed || flushing || !isOnline()) return;
    flushing = true;
    try {
      // Oldest first, one at a time, so the conversation keeps its order.
      for (;;) {
        const next = items.find((item) => item.status === "queued");
        if (!next || disposed) break;
        update(next.clientId, { status: "sending", attempts: next.attempts + 1, error: undefined });
        const current = items.find((item) => item.clientId === next.clientId);
        if (!current) continue;
        try {
          const ack = await send(current);
          if (disposed) return;
          remove(current.clientId);
          onAck(current.clientId, ack);
        } catch (err) {
          if (disposed) return;
          const retryable = err instanceof OutboxSendError ? err.retryable : true;
          const message = err instanceof Error ? err.message : "Failed to send";
          if (retryable && current.attempts < maxAutoAttempts) {
            update(current.clientId, { status: "queued", error: message });
            schedule(outboxRetryDelay(current.attempts, baseDelayMs, maxDelayMs));
          } else {
            update(current.clientId, { status: "failed", error: message });
          }
          break; // keep order: don't send newer messages past one that is waiting to retry
        }
      }
    } finally {
      flushing = false;
    }
  }

  if (items.length > 0) queueMicrotask(() => {
    emit();
    void flush();
  });

  return {
    /** Adds a message and tries to deliver it straight away. Returns its client id. */
    enqueue(payload: OutboxPayload): string {
      const clientId = createId();
      items = [...items, { ...payload, clientId, createdAt: now().toISOString(), status: "queued", attempts: 0 }];
      emit();
      void flush();
      return clientId;
    },
    /** Manual retry of a failed message (resets its automatic attempts). */
    retry(clientId: string) {
      const item = items.find((i) => i.clientId === clientId);
      if (!item || item.status === "sending") return;
      update(clientId, { status: "queued", attempts: 0, error: undefined });
      void flush();
    },
    discard(clientId: string) {
      remove(clientId);
    },
    /** Connectivity came back (socket ready / browser online): send now instead of waiting for backoff. */
    flushNow() {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
      return flush();
    },
    getItems: () => items.map((item) => ({ ...item })),
    dispose() {
      disposed = true;
      if (timer !== null) clearTimer(timer);
      timer = null;
    },
  };
}

export type Outbox<TAck> = ReturnType<typeof createOutbox<TAck>>;
