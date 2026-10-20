"use client";

import { useTranslation } from "@/lib/i18n";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Info, Loader2, OctagonAlert, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidReason, MIN_REASON_LENGTH } from "@/b2b/lib/workspace";

// Small ops-token primitives shared by the workspace. (B2C Button/ConfirmDialog use the cream/green palette.)

export const btn = {
  base: "inline-flex min-h-[44px] items-center justify-center gap-2 rounded px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent",
  primary: "bg-ops-ink text-white hover:bg-ops-chrome",
  secondary: "border border-ops-border-strong bg-ops-surface text-ops-ink hover:bg-ops-canvas",
  danger: "bg-sig-vermilion-ink text-white hover:opacity-90",
};
export const btnClass = (variant: "primary" | "secondary" | "danger" = "secondary", extra?: string) => cn(btn.base, btn[variant], extra);

export function Card({ title, icon, action, children, className }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("rounded border border-ops-border bg-ops-surface p-4 md:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ops-ink">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const BANNER_TONE = {
  info: "border-sig-blue-ink bg-sig-blue-tint text-sig-blue-ink",
  warning: "border-sig-orange-ink bg-sig-orange-tint text-sig-orange-ink",
  danger: "border-sig-vermilion-ink bg-sig-vermilion-tint text-sig-vermilion-ink",
  neutral: "border-ops-border-strong bg-ops-canvas text-ops-ink-muted",
} as const;

export function Banner({ tone = "info", title, children, action, role }: { tone?: keyof typeof BANNER_TONE; title?: string; children?: ReactNode; action?: ReactNode; role?: "alert" | "status" }) {
  const Icon = tone === "danger" ? OctagonAlert : tone === "warning" ? AlertTriangle : Info;
  return (
    <div role={role} className={cn("flex flex-wrap items-start gap-3 rounded border-l-4 p-3 text-sm", BANNER_TONE[tone])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5" : undefined}>{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Banner tone="danger" role="alert" title={t("b2b.common.loadFailed", "Couldn't load")} action={
      <button type="button" onClick={onRetry} className={btnClass("secondary", "text-ops-ink")}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />{t("b2b.common.retry", "Retry")}
      </button>
    }>{message}</Banner>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-ops-ink-muted">
      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      {label}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded bg-ops-border motion-safe:animate-pulse", className)} />;
}

export const fieldClass = "w-full rounded border border-ops-border-strong bg-ops-surface px-3 py-2 text-sm text-ops-ink placeholder:text-ops-ink-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-accent";

/** Inline required-reason field (>= 3 chars). */
export function ReasonField({ label, value, onChange, disabled, hint, shortMessage }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; hint?: string; shortMessage?: string }) {
  const { t } = useTranslation();
  const id = useId();
  const touched = value.length > 0 && !isValidReason(value);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold text-ops-ink">{label}</label>
      <textarea id={id} rows={3} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-invalid={touched} aria-describedby={`${id}-h`} className={fieldClass} />
      <p id={`${id}-h`} className={cn("mt-1 text-xs", touched ? "text-sig-vermilion-ink" : "text-ops-ink-muted")}>
        {touched ? shortMessage ?? t("b2b.reason.short", "Enter at least {n} characters.").replace("{n}", String(MIN_REASON_LENGTH)) : hint ?? t("b2b.reason.required", "Required, at least {n} characters.").replace("{n}", String(MIN_REASON_LENGTH))}
      </p>
    </div>
  );
}

interface ReasonDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  reasonLabel?: string;
  /** Translated texts (English defaults). */
  cancelLabel?: string;
  reasonHint?: string;
  reasonShort?: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  loading?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/** Native <dialog> (focus trap, Esc, inert background) with a required reason textarea. */
export function ReasonDialog({ open, ...rest }: ReasonDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); if (!rest.loading) rest.onCancel(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-[460px] rounded border border-ops-border bg-ops-surface p-0 text-ops-ink shadow-xl backdrop:bg-ops-chrome/60 max-md:mb-0 max-md:mt-auto max-md:w-full max-md:max-w-none max-md:rounded-b-none"
    >
      {open ? <ReasonForm {...rest} titleId={titleId} /> : null}
    </dialog>
  );
}

/** Mounted only while open, so the reason resets each time. */
function ReasonForm({ title, description, reasonLabel, cancelLabel, reasonHint, reasonShort, confirmLabel, tone = "primary", loading, error, onConfirm, onCancel, titleId }: Omit<ReasonDialogProps, "open"> & { titleId: string }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const valid = isValidReason(reason);
  return (
    <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); if (valid && !loading) onConfirm(reason.trim()); }}>
      <h2 id={titleId} className="text-lg font-bold">{title}</h2>
      {description ? <div className="text-sm text-ops-ink-muted">{description}</div> : null}
      <ReasonField label={reasonLabel ?? t("b2b.job.reason", "Reason")} value={reason} onChange={setReason} disabled={loading} hint={reasonHint} shortMessage={reasonShort} />
      {error ? <Banner tone="danger" role="alert">{error}</Banner> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={loading} className={btnClass("secondary")}>{cancelLabel ?? t("b2b.common.cancel", "Cancel")}</button>
        <button type="submit" disabled={!valid || loading} aria-busy={loading || undefined} className={btnClass(tone === "danger" ? "danger" : "primary")}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {confirmLabel}
        </button>
      </div>
    </form>
  );
}

/** Plain confirm (no reason) on the native dialog, ops colours. */
export function ConfirmBox({ open, title, description, confirmLabel, loading, onConfirm, onCancel }: { open: boolean; title: string; description?: ReactNode; confirmLabel: string; loading?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); onCancel(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-[420px] rounded border border-ops-border bg-ops-surface p-0 text-ops-ink backdrop:bg-ops-chrome/60 max-md:mb-0 max-md:mt-auto max-md:w-full max-md:max-w-none max-md:rounded-b-none">
      <div className="space-y-4 p-5">
        <h2 id={titleId} className="text-lg font-bold">{title}</h2>
        {description ? <div className="text-sm text-ops-ink-muted">{description}</div> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={loading} className={btnClass("secondary")}>{t("b2b.common.cancel", "Cancel")}</button>
          <button type="button" onClick={onConfirm} disabled={loading} aria-busy={loading || undefined} className={btnClass("danger")}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}
