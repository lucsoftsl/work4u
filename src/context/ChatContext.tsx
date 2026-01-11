'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { ChatMessage } from '@/hooks/useChatWebSocket';

export interface ChatNotification extends ChatMessage {
    senderName: string;
    jobId?: string;
}

interface ChatContextType {
    unreadCount: number;
    notifications: ChatNotification[];
    addNotification: (notification: ChatNotification) => void;
    clearNotifications: () => void;
    removeNotification: (messageId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<ChatNotification[]>([]);

    const addNotification = useCallback((notification: ChatNotification) => {
        setNotifications((prev) => [notification, ...prev]);

        // Auto-remove notification after 5 seconds
        const timer = setTimeout(() => {
            setNotifications((prev) =>
                prev.filter((n) => n.id !== notification.id)
            );
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const removeNotification = useCallback((messageId: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== messageId));
    }, []);

    const unreadCount = notifications.length;

    return (
        <ChatContext.Provider
            value={{
                unreadCount,
                notifications,
                addNotification,
                clearNotifications,
                removeNotification,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within ChatProvider');
    }
    return context;
}
