"use client";

import { useTranslation } from "@/lib/i18n";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "./useFocusTrap";

/**
 * Right-hand drawer (a full-width sheet below 768 px) on a native <dialog>: focus trap, Esc, focus restore come from the browser.
 * Content is only mounted while open, so forms start fresh each time.
 */
export function Drawer({ open, title, onClose, children, closeLabel }: { open: boolean; title: string; onClose: () => void; children: ReactNode; closeLabel?: string }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useFocusTrap(ref, open);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-full max-h-none w-full max-w-none border-l border-ops-border-strong bg-ops-surface p-0 text-ops-ink backdrop:bg-black/40 md:w-[480px]"
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-ops-border p-4">
            <h2 id={titleId} className="text-lg font-bold">{title}</h2>
            <button type="button" onClick={onClose} aria-label={closeLabel ?? t("b2b.common.close", "Close")} className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
