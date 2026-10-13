"use client";

import { useId, useState } from "react";
import { Pause } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { PauseReason } from "@/b2b/api/types";
import { TechDialog } from "./TechDialog";

const MIN_OTHER_NOTE = 3;
const REASONS: ReadonlyArray<{ value: PauseReason; key: string; label: string }> = [
  { value: "BREAK", key: "b2b.tech.pause.reason.break", label: "Break" },
  { value: "PARTS", key: "b2b.tech.pause.reason.parts", label: "Waiting for parts" },
  { value: "CUSTOMER_AWAY", key: "b2b.tech.pause.reason.customerAway", label: "Customer away" },
  { value: "OTHER", key: "b2b.tech.pause.reason.other", label: "Other" },
];

export function PauseSheet({ open, busy, onCancel, onConfirm }: { open: boolean; busy?: boolean; onCancel: () => void; onConfirm: (reason: PauseReason, note?: string) => void }) {
  const { t } = useTranslation();
  return (
    <TechDialog open={open} title={t("b2b.tech.pause.title", "Pause work")} onClose={onCancel}>
      {open ? <Form busy={busy} onCancel={onCancel} onConfirm={onConfirm} t={t} /> : null}
    </TechDialog>
  );
}

function Form({ busy, onCancel, onConfirm, t }: { busy?: boolean; onCancel: () => void; onConfirm: (r: PauseReason, note?: string) => void; t: (k: string, f: string) => string }) {
  const [reason, setReason] = useState<PauseReason | null>(null);
  const [note, setNote] = useState("");
  const noteId = useId();
  const errId = useId();
  const otherMissing = reason === "OTHER" && note.trim().length < MIN_OTHER_NOTE;
  const canSubmit = reason !== null && !otherMissing && !busy;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (canSubmit && reason) onConfirm(reason, note.trim() || undefined); }} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-bold">{t("b2b.tech.pause.why", "Why are you pausing?")}</legend>
        {REASONS.map((r) => (
          <label key={r.value} className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded border border-ops-border-strong px-3 has-[:checked]:border-2 has-[:checked]:bg-sig-blue-tint">
            <input type="radio" name="pause-reason" className="h-5 w-5 shrink-0" checked={reason === r.value} onChange={() => setReason(r.value)} />
            <span className="font-bold">{t(r.key, r.label)}</span>
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor={noteId} className="mb-1 block text-sm font-bold">{t("b2b.tech.pause.noteLabel", "Note (optional)")}</label>
        <input id={noteId} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} aria-invalid={otherMissing && note.length > 0 ? true : undefined} aria-describedby={otherMissing ? errId : undefined} className="min-h-[48px] w-full rounded border border-ops-border-strong px-2" autoComplete="off" />
        {otherMissing ? <p id={errId} className="mt-1 text-sm text-sig-vermilion-ink">{t("b2b.tech.pause.otherRequired", "Say what's happening.")}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="min-h-[48px] rounded border-2 border-ops-border-strong font-bold">{t("b2b.tech.job.cancel", "Cancel")}</button>
        <button type="submit" disabled={!canSubmit} className="flex min-h-[56px] items-center justify-center gap-2 rounded bg-ops-ink font-bold text-white disabled:opacity-45"><Pause className="h-5 w-5" aria-hidden="true" />{t("b2b.tech.pause.confirm", "Pause")}</button>
      </div>
    </form>
  );
}
