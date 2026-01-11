/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowLeft, Send, AlertCircle } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface Conversation {
    userId: string;
    userName: string;
    userImage?: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    jobId?: string;
    jobTitle?: string;
    messages: any[];
}

interface OtherUserData {
    id: string;
    name: string;
    email: string;
}

interface ConversationData {
    otherUserData: OtherUserData;
    lastMessageDate: string;
    messageCount: number;
    unreadCount: number;
}

export default function ChatPage() {
    const { firebaseToken, user } = useAuth();
    const { isConnected, messages: wsMessages, sendMessage } = useChatWebSocket(firebaseToken, "");
    const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
    const [selectedConversationKey, setSelectedConversationKey] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const loadedConversationsRef = useRef<Set<string>>(new Set());

    // Load existing conversations from backend
    useEffect(() => {
        const loadConversations = async () => {
            if (!firebaseToken) {
                setLoadingConversations(false);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/messages/conversations`, {
                    headers: {
                        Authorization: `Bearer ${firebaseToken}`,
                    },
                });

                if (!response.ok) throw new Error("Failed to fetch conversations");

                const conversationList: ConversationData[] = await response.json();

                // Initialize conversations with backend data
                // Note: Backend doesn't return jobId in conversations endpoint yet
                // Messages will be grouped by jobId when WebSocket messages arrive
                const newConversations = new Map<string, Conversation>();
                conversationList.forEach((conv) => {
                    newConversations.set(conv.otherUserData.id, {
                        userId: conv.otherUserData.id,
                        userName: conv.otherUserData.name,
                        lastMessage: "",
                        lastMessageTime: conv.lastMessageDate,
                        unreadCount: conv.unreadCount,
                        messages: [],
                    });
                });

                setConversations(newConversations);
            } catch (error) {
                console.error("Failed to load conversations:", error);
            } finally {
                setLoadingConversations(false);
            }
        };

        loadConversations();
    }, [firebaseToken]);

    // Group messages by user and job
    useEffect(() => {
        if (wsMessages.length === 0) return;

        setConversations((prevConversations) => {
            const grouped = new Map<string, Conversation>(prevConversations);

            wsMessages.forEach((msg) => {
                const otherUserId = msg.isSent ? msg.toUserId : msg.fromUserId;
                const senderName = msg.isSent ? "You" : msg.fromUserId;
                const jobId = msg.message?.jobId;
                const jobTitle = msg.message?.jobTitle;

                // Create unique key combining userId and jobId
                const conversationKey = jobId ? `${otherUserId}_${jobId}` : otherUserId;

                if (!grouped.has(conversationKey)) {
                    grouped.set(conversationKey, {
                        userId: otherUserId,
                        userName: senderName,
                        lastMessage: msg.message.text || "(image)",
                        lastMessageTime: msg.dateTimeCreated,
                        unreadCount: msg.isSent ? 0 : 1,
                        jobId: jobId,
                        jobTitle: jobTitle,
                        messages: [],
                    });
                }

                const conv = grouped.get(conversationKey)!;
                const messageExists = conv.messages.some((m) => m.id === msg.id);
                if (!messageExists) {
                    conv.messages.push(msg);
                    conv.lastMessage = msg.message.text || "(image)";
                    conv.lastMessageTime = msg.dateTimeCreated;
                    // Persist jobTitle if present and not yet set
                    if (!conv.jobTitle && jobTitle) {
                        conv.jobTitle = jobTitle;
                    }
                    if (!msg.isSent) {
                        conv.unreadCount++;
                    }
                }
            });

            return grouped;
        });
    }, [wsMessages]);

    // Fetch messages when conversation is selected
    useEffect(() => {
        if (!selectedConversationKey || !firebaseToken) return;

        // Skip if already loaded
        if (loadedConversationsRef.current.has(selectedConversationKey)) return;

        const selectedConv = conversations.get(selectedConversationKey);
        if (!selectedConv) return;

        const fetchMessages = async () => {
            setLoadingMessages(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/messages?withUserId=${selectedConv.userId}`, {
                    headers: {
                        Authorization: `Bearer ${firebaseToken}`,
                    },
                });

                if (!response.ok) throw new Error("Failed to fetch messages");

                const messages = await response.json();

                // Filter messages by jobId if the conversation is for a specific job
                const filteredMessages = selectedConv.jobId
                    ? messages.filter((msg: any) => msg.message?.jobId === selectedConv.jobId)
                    : messages.filter((msg: any) => !msg.message?.jobId);

                // Derive jobTitle from messages if absent
                const derivedTitle = selectedConv.jobTitle ?? filteredMessages.find((m: any) => m.message?.jobTitle)?.message?.jobTitle;

                // Mark as loaded
                loadedConversationsRef.current.add(selectedConversationKey);

                // Update the selected conversation with fetched messages
                setConversations((prevConversations) => {
                    const updated = new Map(prevConversations);
                    const conv = updated.get(selectedConversationKey);
                    if (conv) {
                        conv.messages = filteredMessages;
                        if (derivedTitle) conv.jobTitle = derivedTitle;
                    }
                    return updated;
                });
            } catch (error) {
                console.error("Failed to load messages:", error);
            } finally {
                setLoadingMessages(false);
            }
        };

        fetchMessages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConversationKey, firebaseToken]);

    const selectedConversation = selectedConversationKey ? conversations.get(selectedConversationKey) : null;

    const handleSend = () => {
        if (!input.trim() || !selectedConversationKey || !selectedConversation) return;
        sendMessage({
            toUserId: selectedConversation.userId,
            text: input.trim(),
            jobId: selectedConversation?.jobId,
            jobTitle: selectedConversation?.jobTitle,
        });
        setInput("");
    };

    const sortedConversations = Array.from(conversations.entries()).sort(
        ([, a], [, b]) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    if (!firebaseToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white rounded-lg shadow-lg p-8 text-center space-y-4 max-w-md">
                    <p className="text-lg font-semibold text-gray-900">Sign in to chat</p>
                    <p className="text-gray-600">You need to be signed in to view and send messages.</p>
                    <Button asChild className="w-full">
                        <Link href="/signin">Sign In</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Conversations List */}
            <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col ${selectedConversationKey ? "hidden md:flex" : ""}`}>
                <div className="border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingConversations ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin">
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                            </div>
                        </div>
                    ) : sortedConversations.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>No conversations yet</p>
                        </div>
                    ) : (
                        sortedConversations.map(([conversationKey, conv]) => (
                            <button
                                key={conversationKey}
                                onClick={() => setSelectedConversationKey(conversationKey)}
                                className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${selectedConversationKey === conversationKey ? "bg-blue-50" : ""
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">{conv.userName}</p>
                                        {conv.jobTitle && conv.jobId && (
                                            <Link href={`/jobs/${conv.jobId}`} className="text-xs text-blue-600 hover:underline">
                                                {conv.jobTitle}
                                            </Link>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat View */}
            <div className={`flex-1 flex flex-col ${selectedConversationKey ? "" : "hidden md:flex"}`}>
                {selectedConversationKey && selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedConversationKey(null)}
                                    className="md:hidden"
                                >
                                    <ArrowLeft size={20} />
                                </Button>
                                <div>
                                    <p className="font-semibold text-gray-900">{selectedConversation.userName}</p>
                                    {selectedConversation.jobTitle && selectedConversation.jobId && (
                                        <Link href={`/jobs/${selectedConversation.jobId}`} className="text-xs text-blue-600 hover:underline">
                                            {selectedConversation.jobTitle}
                                        </Link>
                                    )}
                                    <p className="text-xs text-gray-500">{isConnected ? "Online" : "Offline"}</p>
                                </div>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin">
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                                    </div>
                                </div>
                            ) : selectedConversation.messages.length === 0 ? (
                                <p className="text-center text-gray-500 text-sm py-4">No messages yet. Start the conversation!</p>
                            ) : (
                                selectedConversation.messages
                                    .sort((a, b) => new Date(a.dateTimeCreated).getTime() - new Date(b.dateTimeCreated).getTime())
                                    .map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.fromUserId === user?.id ? "justify-end" : "justify-start"}`}>
                                            <div
                                                className={`max-w-xs rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.fromUserId === user?.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                                                    }`}
                                            >
                                                <p className="whitespace-pre-wrap">{msg.message.text || "Sent an image"}</p>
                                                <div className={`mt-1 text-[10px] ${msg.fromUserId === user?.id ? "text-blue-100" : "text-gray-500"}`}>
                                                    {new Date(msg.dateTimeCreated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>

                        {/* Chat Input */}
                        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
                            {!isConnected && (
                                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle size={16} className="text-yellow-700 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-yellow-800">Connection lost. Messages will be sent when reconnected.</p>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Write a message..."
                                    className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <Button size="icon" onClick={handleSend} disabled={!isConnected} aria-label="Send message">
                                    <Send size={16} />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Select a conversation to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
}
