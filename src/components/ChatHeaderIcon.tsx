"use client";

import Link from "@/components/LocaleLink";
import { MessageCircle } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useTranslation } from "@/lib/i18n";

export function ChatHeaderIcon() {
    const { unreadCount } = useChat();
    const { t } = useTranslation();

    return (
        <Link
            href="/chat"
            className="relative p-2 rounded-full hover:bg-sunken transition-colors text-ink hover:text-ink"
            aria-label={t('chat.messagesAria')}
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
