"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Label repeats the verb ("Remove service"), never just "OK". */
  confirmLabel: string;
  tone?: "primary" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Replaces window.confirm. Built on the native <dialog> so the browser provides the focus trap,
 * Esc handling, inert background and focus return to the trigger. Bottom sheet on mobile.
 */
export function ConfirmDialog({ open, title, description, confirmLabel, tone = "primary", loading, onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Destructive actions start on Cancel.
      if (tone === "destructive") cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, tone]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-[440px] rounded-sheet bg-surface p-0 text-ink shadow-raised backdrop:bg-ink/40",
        "max-md:mb-0 max-md:mt-auto max-md:w-full max-md:max-w-none max-md:rounded-b-none"
      )}
    >
      <div className="p-6">
        <h2 id={titleId} className="font-display text-h3 text-ink">
          {title}
        </h2>
        {description ? <div className="mt-2 text-body text-ink-muted">{description}</div> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button variant={tone === "destructive" ? "destructive" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
