"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useChat } from "@/context/ChatContext";

export function ChatHeaderIcon() {
    const { unreadCount } = useChat();

    return (
        <Link
            href="/chat"
            className="relative p-2 rounded-full hover:bg-muted transition-colors text-foreground hover:text-foreground"
            aria-label="Messages"
        >
            <MessageCircle size={24} />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
        </Link>
    );
}
