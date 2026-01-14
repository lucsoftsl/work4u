"use client";

import { MessageCircle, X } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import Link from "next/link";

export function ChatNotifications() {
    const { notifications, removeNotification } = useChat();

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className="bg-card rounded-lg shadow-lg border border-blue-200 p-4 animate-slide-in"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                            <MessageCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground text-sm">
                                    {notification.senderName}
                                </p>
                                <p className="text-muted-foreground text-sm line-clamp-2">
                                    {notification.message.text || "Sent an image"}
                                </p>
                                {notification.jobId && (
                                    <Link
                                        href={`/jobs/${notification.jobId}`}
                                        className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                                    >
                                        View job
                                    </Link>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => removeNotification(notification.id)}
                            className="text-muted-foreground hover:text-muted-foreground flex-shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
