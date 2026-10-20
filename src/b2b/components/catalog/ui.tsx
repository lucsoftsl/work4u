"use client";

import { useTranslation } from "@/lib/i18n";

import { useId, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export const btnPrimary = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded bg-ops-ink px-4 text-sm font-bold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
export const btnSecondary = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded border border-ops-border-strong bg-ops-surface px-4 text-sm font-bold text-ops-ink enabled:hover:bg-ops-canvas disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
export const btnDanger = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded bg-sig-vermilion-ink px-4 text-sm font-bold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
export const inputCls = "min-h-[44px] w-full rounded border border-ops-border-strong bg-ops-surface px-3 text-sm text-ops-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1";

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: (p: { id: string; describedBy?: string; invalid: boolean }) => ReactNode }) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-bold text-ops-ink">{label}</label>
      {children({ id, describedBy: error || hint ? msgId : undefined, invalid: !!error })}
      {(error || hint) && <p id={msgId} className={cn("text-xs", error ? "font-bold text-sig-vermilion-ink" : "text-ops-ink-muted")}>{error ?? hint}</p>}
    </div>
  );
}

export function ErrorAlert({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-sig-vermilion-ink bg-ops-surface p-4">
      <TriangleAlert className="h-5 w-5 shrink-0 text-sig-vermilion-ink" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm text-ops-ink">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className={btnPrimary}>{retryLabel ?? t("b2b.common.retry", "Retry")}</button>}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      <span className="sr-only">{t("b2b.common.loading", "Loading")}</span>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-ops-border motion-reduce:animate-none" />)}
    </div>
  );
}
