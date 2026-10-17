"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/b2b/setup/useFocusTrap";

/** Native <dialog>: focus trap, Esc to close and focus restore come from the browser. */
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useFocusTrap(ref, open);
  // A dialog whose content carries its own heading (data-modal-title) is named by it instead of an empty <h2>.
  useEffect(() => {
    const d = ref.current;
    if (!open || title || !d) return;
    const heading = d.querySelector<HTMLElement>("[data-modal-title]");
    if (heading?.id) d.setAttribute("aria-labelledby", heading.id);
  }, [open, title]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-ops-border-strong bg-ops-surface p-0 text-ops-ink backdrop:bg-black/40"
    >
      {open && (
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            {title ? <h2 id={titleId} className="text-lg font-bold">{title}</h2> : <span />}
            <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
