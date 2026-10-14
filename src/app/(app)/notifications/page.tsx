"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { currentPath, signInPath } from "@/lib/auth-redirect";
import { useNotificationFeed } from "@/hooks/useNotificationFeed";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/QueryState";
import { BackLink } from "@/components/ui/BackLink";

const PAGE_LIMIT = 100;

export default function NotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const feed = useNotificationFeed(isAuthenticated, PAGE_LIMIT);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace(signInPath(currentPath()));
  }, [authLoading, isAuthenticated, router]);

  return (
    <div className="mx-auto w-full max-w-3xl px-[var(--gutter)] py-8 md:py-12">
      <BackLink href="/dashboard" label={t("nav.backToDashboard")} className="mb-2" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h1 text-ink">{t("notif.title")}</h1>
        <Button variant="secondary" onClick={() => void feed.markAll()} disabled={feed.unreadInList === 0}>
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          {t("notif.markAllRead")}
        </Button>
      </div>

      {feed.actionError ? <p role="alert" className="mt-3 text-label text-danger">{t("notif.markError")}</p> : null}

      <div className="mt-6">
        {authLoading || feed.loading ? (
          <ListSkeleton rows={4} />
        ) : feed.error ? (
          <ErrorState message={t("notif.loadError")} onRetry={feed.reload} />
        ) : feed.items.length === 0 ? (
          <EmptyState icon={Bell} title={t("notif.empty")} description={t("notif.emptyHint")} />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface p-1">
            {feed.items.map((n) => (
              <li key={n.id}>
                <NotificationItem notification={n} onOpen={(item) => void feed.markRead(item)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
