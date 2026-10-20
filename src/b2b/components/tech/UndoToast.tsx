"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useOffline, type UndoEntry } from "@/b2b/offline/OfflineProvider";
import { plural } from "@/b2b/lib/plural";

/** The UI window is 8 s (the server allows 30 s). It pauses while the toast is hovered or focused (WCAG 2.2.1). */
export const UNDO_WINDOW_MS = 8000;
const TICK_MS = 250;

/** One undo offer. Keyed by token by the parent, so a newer action restarts the countdown from a clean state. */
function UndoEntryToast({ entry, onUndo, onDismiss }: { entry: UndoEntry; onUndo: () => void; onDismiss: () => void }) {
  const { t, locale } = useTranslation();
  const [paused, setPaused] = useState(false);
  const [left, setLeft] = useState(UNDO_WINDOW_MS);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - TICK_MS)), TICK_MS);
    return () => clearInterval(id);
  }, [paused]);
  useEffect(() => { if (left <= 0) onDismiss(); }, [left, onDismiss]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); onUndo(); }
      if (e.key === "Escape" && !typing) onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onUndo, onDismiss]);

  return (
    <div
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className="pointer-events-auto flex min-h-[56px] max-w-full items-center gap-3 rounded-xl bg-ops-ink px-4 text-white"
    >
      <p role="status" aria-live="polite" aria-atomic="true" className="min-w-0 flex-1 text-sm font-bold">
        <span className="sr-only">{plural(t, locale, "b2b.tech.undo.available", { one: "{action}. Undo available for {n} second.", other: "{action}. Undo available for {n} seconds." }, Math.round(UNDO_WINDOW_MS / 1000), { action: entry.text })}</span>
        <span aria-hidden="true">{entry.text}</span>
      </p>
      <button type="button" onClick={onUndo} className="min-h-[48px] min-w-[48px] rounded border-2 border-white px-4 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        {t("b2b.tech.undo.btn", "Undo")} <span aria-hidden="true" className="font-mono text-xs">{Math.ceil(left / 1000)}s</span>
      </button>
      <button type="button" onClick={onDismiss} aria-label={t("b2b.tech.undo.dismiss", "Dismiss")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded"><X className="h-5 w-5" aria-hidden="true" /></button>
    </div>
  );
}

/** Toast for the latest undoable action. Polite status; a failed undo is an alert. Ctrl/⌘+Z undoes when focus isn't in a text field. */
export function UndoToast() {
  const { t } = useTranslation();
  const { undoEntry, undoMessage, undoLast, dismissUndo, clearUndoMessage } = useOffline();
  const undo = useCallback(() => { void undoLast(); }, [undoLast]);

  useEffect(() => {
    if (!undoMessage) return;
    const id = setTimeout(clearUndoMessage, 6000);
    return () => clearTimeout(id);
  }, [undoMessage, clearUndoMessage]);

  return (
    <div className="pointer-events-none mb-2 flex justify-center empty:mb-0">
      {undoMessage ? (
        <p role="alert" className="pointer-events-auto flex min-h-[56px] items-center gap-3 rounded-xl bg-sig-vermilion-ink px-4 text-sm font-bold text-white">
          {undoMessage}
          <button type="button" onClick={clearUndoMessage} aria-label={t("b2b.tech.undo.dismiss", "Dismiss")} className="flex h-11 w-11 items-center justify-center rounded"><X className="h-5 w-5" aria-hidden="true" /></button>
        </p>
      ) : undoEntry ? <UndoEntryToast key={undoEntry.token} entry={undoEntry} onUndo={undo} onDismiss={dismissUndo} /> : null}
    </div>
  );
}
