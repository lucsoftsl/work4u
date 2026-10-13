"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Native <dialog> sheet (focus trap, Esc, inert background): bottom sheet on phones, centred card on tablets.
 * The caller restores focus to its trigger from `onClose`.
 */
export function TechDialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); d.querySelector<HTMLElement>("h2")?.focus(); }
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-[480px] overflow-y-auto rounded-2xl border-2 border-ops-border-strong bg-ops-surface p-0 text-ops-ink backdrop:bg-ops-chrome/60 max-md:mb-0 max-md:mt-auto max-md:w-full max-md:max-w-none max-md:rounded-b-none"
    >
      {open ? (
        <div className="space-y-4 p-5">
          <h2 id={titleId} tabIndex={-1} className="text-lg font-bold focus:outline-none">{title}</h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
