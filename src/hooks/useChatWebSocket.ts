/* eslint-disable @typescript-eslint/no-explicit-any -- socket and history payloads are untyped JSON */
import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson, errorMessage, getFreshToken } from "@/lib/http";
import { OutboxSendError, createOutbox, type Outbox, type OutboxItem, type OutboxPayload } from "@/lib/chat-outbox";
import {
    chatSocketProtocols, chatSocketUrl, dedupeSorted, isRetryableSendError, reconnectDelay, CLOSE_ACCOUNT_INACTIVE,
} from "@/lib/chat-socket";
import { loadOutbox, saveOutbox } from "@/lib/chat-outbox-storage";
import { useAuth } from "@/context/AuthContext";

export interface ChatMessage {
    id: string;
    fromUserId: string;
    toUserId: string;
    message: {
        text?: string;
        imageUrl?: string;
        translatedText?: string;
        translatedLang?: string;
        sourceLang?: string;
    };
    jobData?: {
        id?: string;
        title?: string;
    };
    dateTimeCreated: string;
    /** Idempotency key echoed by the API; lets a reloaded thread match a pending outbox item. */
    clientId?: string | null;
    isSent: boolean;
    isRead: boolean;
}

export type { OutboxItem } from "@/lib/chat-outbox";
export { chatSocketProtocols, chatSocketUrl, compareMessages, isRetryableSendError, reconnectDelay } from "@/lib/chat-socket";

export function useChatWebSocket(firebaseToken: string | null, otherUserId?: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);

    const ws = useRef<WebSocket | null>(null);
    const readyUserIdRef = useRef<string | null>(null);
    const outboxRef = useRef<Outbox<ChatMessage | null> | null>(null);
    const signedIn = !!firebaseToken;
    const { user } = useAuth();
    const userId = user?.id;

    const normalizeMessage = useCallback((raw: any): ChatMessage | null => {
        if (!raw) return null;
        const msg: any = raw?.message ? raw : raw?.message;
        const fromUserId = msg?.fromUserId;
        const toUserId = msg?.toUserId;
        const id = msg?.id;
        if (!id || !fromUserId || !toUserId) return null;

        const readyUserId = readyUserIdRef.current;
        return {
            id,
            fromUserId,
            toUserId,
            message: {
                text: msg?.message?.text ?? msg?.text ?? undefined,
                imageUrl: msg?.message?.imageUrl ?? msg?.imageUrl ?? undefined,
                translatedText: msg?.message?.translatedText ?? undefined,
                translatedLang: msg?.message?.translatedLang ?? undefined,
                sourceLang: msg?.message?.sourceLang ?? undefined,
            },
            jobData: msg?.jobData ?? msg?.message?.jobData ?? undefined,
            dateTimeCreated: msg?.dateTimeCreated ?? new Date().toISOString(),
            clientId: msg?.clientId ?? null,
            isSent: typeof readyUserId === "string" ? fromUserId === readyUserId : !!msg?.isSent,
            isRead: !!msg?.isRead,
        };
    }, []);

    const appendMessages = useCallback((incoming: ChatMessage[]) => {
        if (incoming.length === 0) return;
        setMessages((prev) => dedupeSorted([...prev, ...incoming]));
    }, []);

    // Outbox: every outgoing message goes over HTTP POST, which returns the saved message (the ack).
    // The socket only receives. This avoids the "socket open but not yet authenticated" window in
    // which a frame could be dropped silently, and gives an exact per-message ack.
    useEffect(() => {
        if (!signedIn) return;
        const outbox = createOutbox<ChatMessage | null>({
            send: async (item) => {
                try {
                    const raw = await apiJson<any>(`/api/messages`, {
                        method: "POST",
                        auth: true,
                        // clientId makes retries idempotent: the API answers 200 with the original message when it already saved it.
                        json: { toUserId: item.toUserId, text: item.text, imageUrl: item.imageUrl, jobData: item.jobData, clientId: item.clientId },
                    });
                    return normalizeMessage(raw);
                } catch (err) {
                    throw new OutboxSendError(errorMessage(err, "Failed to send message."), isRetryableSendError(err));
                }
            },
            onAck: (_clientId, ack) => {
                if (ack) appendMessages([{ ...ack, isSent: true }]);
            },
            initialItems: userId ? loadOutbox(userId) : [],
            onChange: (items) => {
                if (userId) saveOutbox(userId, items);
                setOutboxItems(items);
                const failed = items.find((i) => i.status === "failed");
                setError(failed ? failed.error ?? "Failed to send message." : null);
            },
            isOnline: () => typeof navigator === "undefined" || navigator.onLine !== false,
        });
        outboxRef.current = outbox;
        return () => {
            outbox.dispose();
            if (outboxRef.current === outbox) outboxRef.current = null;
            setOutboxItems([]);
        };
    }, [signedIn, userId, normalizeMessage, appendMessages]);

    // History loads over HTTP whether or not the socket is up. The API returns the newest page.
    const loadHistory = useCallback(async (userId: string) => {
        setIsLoadingHistory(true);
        setHistoryError(null);
        try {
            const params = new URLSearchParams({ withUserId: userId });
            const historyRaw = await apiJson<any[]>(`/api/messages?${params.toString()}`, { auth: true, cache: "no-store" });
            const normalized = (Array.isArray(historyRaw) ? historyRaw : [])
                .map((m) => normalizeMessage(m))
                .filter(Boolean) as ChatMessage[];
            // Merge, don't replace: live messages that arrived while the request was in flight stay.
            setMessages((prev) => dedupeSorted([...prev, ...normalized]));
        } catch (err) {
            setHistoryError(errorMessage(err, "Couldn't load messages."));
        } finally {
            setIsLoadingHistory(false);
        }
    }, [normalizeMessage]);

    useEffect(() => {
        if (!signedIn || !otherUserId) return;
        setMessages([]);
        void loadHistory(otherUserId);
    }, [signedIn, otherUserId, loadHistory]);

    // Socket lifecycle: connect with a fresh token in the subprotocol, "connected" only after `ready`.
    useEffect(() => {
        if (!signedIn) return;
        let disposed = false;
        let attempt = 0;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const scheduleReconnect = () => {
            if (disposed || timer) return;
            setIsReconnecting(true);
            timer = setTimeout(() => {
                timer = null;
                void connect();
            }, reconnectDelay(attempt));
            attempt += 1;
        };

        const connect = async () => {
            if (disposed) return;
            const current = ws.current;
            if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) return;
            const token = await getFreshToken(attempt > 0);
            if (disposed) return;
            if (!token) {
                scheduleReconnect();
                return;
            }
            const socket = new WebSocket(chatSocketUrl(), chatSocketProtocols(token));
            ws.current = socket;

            socket.onmessage = (event) => {
                let data: any;
                try {
                    data = JSON.parse(event.data);
                } catch {
                    return;
                }
                if (data.type === "ready") {
                    readyUserIdRef.current = data.userId ?? null;
                    attempt = 0;
                    setIsConnected(true);
                    setIsReconnecting(false);
                    // Back online: deliver anything queued and catch up on what we missed while down.
                    void outboxRef.current?.flushNow();
                    if (otherUserIdRef.current) void loadHistoryRef.current(otherUserIdRef.current);
                } else if (data.type === "message") {
                    const normalized = normalizeMessage(data.message);
                    if (normalized) appendMessages([normalized]);
                } else if (data.type === "messageRead") {
                    setMessages((prev) => prev.map((m) => (m.id === data.messageId ? { ...m, isRead: true } : m)));
                }
                // {type:"error"} frames only concern WS sends, which this client no longer makes.
            };
            socket.onclose = (event) => {
                if (ws.current === socket) ws.current = null;
                setIsConnected(false);
                if (event.code === CLOSE_ACCOUNT_INACTIVE) {
                    setIsReconnecting(false);
                    return;
                }
                scheduleReconnect();
            };
            // onerror is always followed by onclose; reconnect is handled there.
        };

        const reconnectNow = () => {
            if (document.visibilityState === "hidden") return;
            void outboxRef.current?.flushNow();
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            attempt = 0;
            void connect();
        };

        void connect();
        window.addEventListener("online", reconnectNow);
        document.addEventListener("visibilitychange", reconnectNow);

        return () => {
            disposed = true;
            if (timer) clearTimeout(timer);
            window.removeEventListener("online", reconnectNow);
            document.removeEventListener("visibilitychange", reconnectNow);
            const socket = ws.current;
            ws.current = null;
            if (socket) {
                socket.onclose = null;
                socket.close();
            }
            setIsConnected(false);
            setIsReconnecting(false);
        };
    }, [signedIn, normalizeMessage, appendMessages]);

    // Latest values for the socket handler without reconnecting when they change.
    const otherUserIdRef = useRef(otherUserId);
    const loadHistoryRef = useRef(loadHistory);
    useEffect(() => {
        otherUserIdRef.current = otherUserId;
        loadHistoryRef.current = loadHistory;
    }, [otherUserId, loadHistory]);

    /** Queues a message for delivery and returns its client id; never blocks on connectivity. */
    const sendMessage = useCallback((payload: OutboxPayload): string | null => {
        const outbox = outboxRef.current;
        if (!outbox) {
            setError("Not signed in");
            return null;
        }
        return outbox.enqueue(payload);
    }, []);

    const retryMessage = useCallback((clientId: string) => outboxRef.current?.retry(clientId), []);
    const discardMessage = useCallback((clientId: string) => outboxRef.current?.discard(clientId), []);

    const markAsRead = useCallback((messageId: string) => {
        const socket = ws.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify({ action: "markAsRead", messageId }));
    }, []);

    const retryHistory = useCallback(() => {
        if (otherUserId) void loadHistory(otherUserId);
    }, [otherUserId, loadHistory]);

    return {
        isConnected,
        isReconnecting,
        messages,
        outbox: outboxItems,
        sendMessage,
        retryMessage,
        discardMessage,
        markAsRead,
        error,
        isLoadingHistory,
        historyError,
        retryHistory,
    };
}
