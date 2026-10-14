"use client";

import Link from "@/components/LocaleLink";
import { MessageSquare, X } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useTranslation } from "@/lib/i18n";
import { chatHref } from "@/lib/chat-links";

/** Incoming-message toasts: sender, one-line preview, an Open action and a labelled close (design-tokens §5.9). */
export function ChatNotifications() {
  const { notifications, removeNotification } = useChat();
  const { t } = useTranslation();

  if (notifications.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+0.75rem)] z-50 flex flex-col gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:w-[400px]"
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          role="status"
          className="pointer-events-auto flex items-center gap-3 rounded-card bg-ink px-4 py-3 text-surface shadow-raised motion-safe:animate-toast-in"
        >
          <MessageSquare className="h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-label">{notification.senderName}</p>
            <p className="truncate text-caption font-normal text-surface/80">{notification.message.text || t("chat.sentImage")}</p>
          </div>
          <Link
            href={chatHref({ userId: notification.fromUserId, userName: notification.senderName, jobId: notification.jobId })}
            onClick={() => removeNotification(notification.id)}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-control px-3 text-label text-primary-soft underline underline-offset-2 hover:text-surface"
          >
            {t("chat.open")}
          </Link>
          <button
            type="button"
            onClick={() => removeNotification(notification.id)}
            aria-label={t("common.dismiss")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control hover:bg-surface/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
