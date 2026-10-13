"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RotateCcw, type LucideIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

// Loading, empty and error must never look alike (design-tokens §5.8).

/** Skeleton block. The pulse is a no-op under prefers-reduced-motion (motion-safe + global reduce rule). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded-control bg-sunken motion-safe:animate-skeleton", className)} />;
}

/** Skeleton rows with the final row geometry. `aria-busy` + a visually hidden label announce it. */
export function ListSkeleton({ rows = 4, label }: { rows?: number; label?: string }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      <span className="sr-only">{label ?? t("common.loading")}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex items-start justify-between gap-4 rounded-card border border-line bg-surface p-4 md:p-6">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-14 w-24 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function LoadingState({ label, rows }: { label?: string; rows?: number }) {
  return <ListSkeleton label={label} rows={rows ?? 3} />;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** One primary action: a <Button/> or link. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface p-8 text-center md:p-12", className)}>
      <Icon className="h-8 w-8 text-ink-subtle" aria-hidden="true" />
      <p className="font-display text-h3 text-ink">{title}</p>
      {description ? <p className="max-w-md text-body text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message?: string | null; onRetry?: () => void; className?: string }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className={cn("flex flex-col items-start gap-3 rounded-card border border-danger/20 border-l-4 border-l-danger bg-danger-soft p-4 md:p-5", className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
        <div>
          <p className="font-display text-h3 text-ink">{t("common.loadErrorTitle")}</p>
          {message ? <p className="mt-1 text-body text-ink">{message}</p> : null}
        </div>
      </div>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}
