
import { useEffect, useRef, useState } from "react";

export interface ChatMessage {
    id: string;
    fromUserId: string;
    toUserId: string;
    message: {
        text?: string;
        imageUrl?: string;
        jobId?: string;
        jobTitle?: string;
    };
    dateTimeCreated: string;
    isSent: boolean;
    isRead: boolean;
}

export function useChatWebSocket(firebaseToken: string | null, otherUserId?: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const ws = useRef<WebSocket | null>(null);

    // Fetch chat history when connected
    const fetchChatHistory = async (userId: string) => {
        if (!firebaseToken) return;
        try {
            setIsLoadingHistory(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const response = await fetch(
                `${apiUrl}/api/messages?withUserId=${userId}&limit=50`,
                {
                    headers: {
                        Authorization: `Bearer ${firebaseToken}`,
                    },
                }
            );
            if (response.ok) {
                const history: ChatMessage[] = await response.json();
                // Sort by date (oldest first)
                history.sort(
                    (a, b) =>
                        new Date(a.dateTimeCreated).getTime() -
                        new Date(b.dateTimeCreated).getTime()
                );
                setMessages(history);
            }
        } catch (err) {
            console.error("Failed to fetch chat history:", err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (!firebaseToken) return;

        // Connect to WebSocket
        const wsUrl = `ws://localhost:3001/api/messages/ws?token=${firebaseToken}`;
        // For production: wss://your-domain.com/api/messages/ws?token=${firebaseToken}

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log("WebSocket connected");
            setIsConnected(true);
            setError(null);
            // Fetch chat history when connected
            if (otherUserId) {
                fetchChatHistory(otherUserId);
            }
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === "ready") {
                    console.log("Connected as user:", data.userId);
                } else if (data.type === "message") {
                    // New message received or echo of sent message
                    setMessages((prev) => [...prev, data.message]);
                } else if (data.type === "messageRead") {
                    // Mark message as read
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === data.messageId ? { ...msg, isRead: true } : msg
                        )
                    );
                } else if (data.type === "error") {
                    console.error("Chat error:", data.error);
                    setError(data.error);
                }
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
            }
        };

        ws.current.onerror = (error) => {
            console.error("WebSocket error:", error);
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
        jobId,
        jobTitle,
    }: {
        toUserId: string;
        text?: string;
        imageUrl?: string;
        jobId?: string;
        jobTitle?: string;
    }) => {
        // If WebSocket is connected, use WebSocket
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(
                JSON.stringify({
                    action: "sendMessage",
                    toUserId,
                    text,
                    imageUrl,
                    jobId,
                    jobTitle,
                })
            );
            return;
        }

        // Fallback to HTTP API if WebSocket is not connected
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
                body: JSON.stringify({
                    toUserId,
                    text,
                    imageUrl,
                    jobId,
                    jobTitle,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to send message");
            }

            const message: ChatMessage = await response.json();
            // Add the sent message to the messages list
            setMessages((prev) => [...prev, message]);
        } catch (err) {
            console.error("Failed to send message via HTTP:", err);
            setError("Failed to send message. Please try again.");
        }
    };

    const markAsRead = (messageId: string) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            return;
        }

        ws.current.send(
            JSON.stringify({
                action: "markAsRead",
                messageId,
            })
        );
    };

    return { isConnected, messages, sendMessage, markAsRead, error, isLoadingHistory };
}
