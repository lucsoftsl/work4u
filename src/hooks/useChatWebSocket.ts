/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";

export interface ChatMessage {
    id: string;
    fromUserId: string;
    toUserId: string;
    message: {
        text?: string;
        imageUrl?: string;
    };
    jobData?: {
        id?: string;
        title?: string;
    };
    dateTimeCreated: string;
    isSent: boolean;
    isRead: boolean;
}

function dedupeById(messages: ChatMessage[]) {
    return Array.from(new Map(messages.map((m) => [m.id, m])).values());
}

export function useChatWebSocket(firebaseToken: string | null, otherUserId?: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const ws = useRef<WebSocket | null>(null);

    // The authenticated userId as reported by WS "ready"
    const readyUserIdRef = useRef<string | null>(null);

    const normalizeMessage = (raw: any): ChatMessage | null => {
        if (!raw) return null;

        const msg: any = raw?.message ? raw : raw?.message; // handle both shapes if any
        const fromUserId = msg?.fromUserId;
        const toUserId = msg?.toUserId;
        const id = msg?.id;

        if (!id || !fromUserId || !toUserId) return null;

        const readyUserId = readyUserIdRef.current;
        const derivedIsSent =
            typeof readyUserId === "string" ? fromUserId === readyUserId : !!msg?.isSent;

        return {
            id,
            fromUserId,
            toUserId,
            message: {
                text: msg?.message?.text ?? msg?.text ?? undefined,
                imageUrl: msg?.message?.imageUrl ?? msg?.imageUrl ?? undefined,
            },
            jobData: msg?.jobData ?? msg?.message?.jobData ?? undefined,
            dateTimeCreated: msg?.dateTimeCreated ?? new Date().toISOString(),
            isSent: derivedIsSent,
            isRead: !!msg?.isRead,
        };
    };

    // Fetch chat history when connected
    const fetchChatHistory = async (userId: string) => {
        if (!firebaseToken) return;
        try {
            setIsLoadingHistory(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const response = await fetch(`${apiUrl}/api/messages?withUserId=${userId}&limit=50`, {
                headers: { Authorization: `Bearer ${firebaseToken}` },
            });

            if (response.ok) {
                const historyRaw: any[] = await response.json();
                const normalized = historyRaw
                    .map((m) => normalizeMessage(m))
                    .filter(Boolean) as ChatMessage[];

                normalized.sort(
                    (a, b) =>
                        new Date(a.dateTimeCreated).getTime() - new Date(b.dateTimeCreated).getTime()
                );

                setMessages(normalized);
            }
        } catch (err) {
            console.error("Failed to fetch chat history:", err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (!firebaseToken) return;

        const wsUrl = `ws://localhost:3001/api/messages/ws?token=${firebaseToken}`;
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log("WebSocket connected");
            setIsConnected(true);
            setError(null);

            if (otherUserId) {
                fetchChatHistory(otherUserId);
            }
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === "ready") {
                    // ✅ This is crucial for correct isSent computation on the receiver side
                    readyUserIdRef.current = data.userId ?? null;
                    console.log("Connected as user:", readyUserIdRef.current);
                    return;
                }

                if (data.type === "message") {
                    const normalized = normalizeMessage(data.message);
                    if (!normalized) return;

                    setMessages((prev) => {
                        const next = dedupeById([...prev, normalized]);
                        next.sort(
                            (a, b) =>
                                new Date(a.dateTimeCreated).getTime() - new Date(b.dateTimeCreated).getTime()
                        );
                        return next;
                    });
                    return;
                }

                if (data.type === "messageRead") {
                    setMessages((prev) =>
                        prev.map((m) => (m.id === data.messageId ? { ...m, isRead: true } : m))
                    );
                    return;
                }

                if (data.type === "error") {
                    console.error("Chat error:", data.error);
                    setError(data.error);
                    return;
                }
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
            }
        };

        ws.current.onerror = (err) => {
            console.error("WebSocket error:", err);
            setError("Connection error. Please try again.");
        };

        ws.current.onclose = () => {
            console.log("WebSocket disconnected");
            setIsConnected(false);
        };

        return () => {
            ws.current?.close();
        };
    }, [firebaseToken, otherUserId]);

    const sendMessage = async ({
        toUserId,
        text,
        imageUrl,
        jobData,
    }: {
        toUserId: string;
        text?: string;
        imageUrl?: string;
        jobData?: { id?: string; title?: string };
    }) => {
        // WebSocket
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(
                JSON.stringify({
                    action: "sendMessage",
                    toUserId,
                    text,
                    imageUrl,
                    jobData,
                })
            );
            return;
        }

        // Fallback HTTP
        if (!firebaseToken) {
            console.error("Not authenticated");
            setError("Not authenticated");
            return;
        }

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const response = await fetch(`${apiUrl}/api/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${firebaseToken}`,
                },
                body: JSON.stringify({ toUserId, text, imageUrl, jobData }),
            });

            if (!response.ok) throw new Error("Failed to send message");

            const raw = await response.json();
            const normalized = normalizeMessage(raw);
            if (!normalized) return;

            setMessages((prev) => {
                const next = dedupeById([...prev, normalized]);
                next.sort(
                    (a, b) =>
                        new Date(a.dateTimeCreated).getTime() - new Date(b.dateTimeCreated).getTime()
                );
                return next;
            });
        } catch (err) {
            console.error("Failed to send message via HTTP:", err);
            setError("Failed to send message. Please try again.");
        }
    };

    const markAsRead = (messageId: string) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
        ws.current.send(JSON.stringify({ action: "markAsRead", messageId }));
    };

    return { isConnected, messages, sendMessage, markAsRead, error, isLoadingHistory };
}
