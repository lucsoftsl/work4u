'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { ChatMessage } from '@/hooks/useChatWebSocket';
import { useAuth } from '@/context/AuthContext';
import { fetchConversations, invalidateConversations } from '@/api';

export interface ChatNotification extends ChatMessage {
    senderName: string;
    jobId?: string;
}

interface ChatContextType {
    /** Real number of unread messages across conversations (polled), not the toast count. */
    unreadCount: number;
    notifications: ChatNotification[];
    addNotification: (notification: ChatNotification) => void;
    clearNotifications: () => void;
    removeNotification: (messageId: string) => void;
    refreshUnread: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const UNREAD_POLL_MS = 60_000;

/** Polling only makes sense for a visible, connected tab; focus/visibility/online refetch covers the rest. */
export const canPollUnread = () => (typeof document === 'undefined' || document.visibilityState !== 'hidden') && (typeof navigator === 'undefined' || navigator.onLine);

export function sumUnread(conversations: unknown): number {
    if (!Array.isArray(conversations)) return 0;
    return conversations.reduce((total, item) => {
        const n = Number((item as { unreadCount?: unknown })?.unreadCount ?? 0);
        return total + (Number.isFinite(n) && n > 0 ? n : 0);
    }, 0);
}

export function ChatProvider({ children }: { children: ReactNode }) {
    const { firebaseToken } = useAuth();
    const pathname = usePathname();
    const [notifications, setNotifications] = useState<ChatNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const signedIn = !!firebaseToken;

    const addNotification = useCallback((notification: ChatNotification) => {
        invalidateConversations(); // a message arrived: the list/unread are out of date
        setNotifications((prev) => [notification, ...prev]);

        // Auto-remove notification after 5 seconds
        const timer = setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const clearNotifications = useCallback(() => setNotifications([]), []);
    const removeNotification = useCallback((messageId: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== messageId));
    }, []);

    const refreshUnread = useCallback(async () => {
        if (!firebaseToken) {
            setUnreadCount(0);
            return;
        }
        try {
            setUnreadCount(sumUnread(await fetchConversations(firebaseToken)));
        } catch {
            // keep the previous count; the header must not break on a failed poll
        }
        // the token rotates hourly; signed-in state is what matters
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signedIn]);

    // Poll while signed in; also refresh on navigation and when the tab regains focus.
    useEffect(() => {
        if (!signedIn) {
            setUnreadCount(0);
            return;
        }
        void refreshUnread();
        const interval = setInterval(() => { if (canPollUnread()) void refreshUnread(); }, UNREAD_POLL_MS);
        const onFocus = () => { if (canPollUnread()) void refreshUnread(); };
        window.addEventListener('focus', onFocus);
        window.addEventListener('online', onFocus);
        document.addEventListener('visibilitychange', onFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('online', onFocus);
            document.removeEventListener('visibilitychange', onFocus);
        };
    }, [signedIn, refreshUnread]);

    useEffect(() => {
        if (signedIn) void refreshUnread();
    }, [pathname, signedIn, refreshUnread]);

    return (
        <ChatContext.Provider
            value={{ unreadCount, notifications, addNotification, clearNotifications, removeNotification, refreshUnread }}
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
