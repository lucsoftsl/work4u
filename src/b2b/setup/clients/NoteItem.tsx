"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pin, PinOff } from "lucide-react";
import { useTr } from "@/b2b/setup/i18n";
import { deleteNote, updateNote, type ClientNote } from "@/b2b/setup/api";
import { setupErrorMessage } from "@/b2b/setup/errors";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, btnDanger, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { NOTE_MAX, canDeleteNote, canEditNote, canPinNote, noteExcerpt, validateNoteBody, noteAuthorLabel } from "./noteRules";
import { shortDate } from "./parts";

export function NoteItem({ orgId, clientId, note, can, offline }: { orgId: string; clientId: string; note: ClientNote; can: (p: string) => boolean; offline: boolean }) {
  const { tr } = useTr();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [confirm, setConfirm] = useState(false);
  const done = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["org", orgId, "customer", clientId] })]); };
  const edit = useMutation({ mutationFn: () => updateNote(orgId, clientId, note.id, { body: body.trim() }), onSuccess: async () => { await done(); setEditing(false); } });
  const pin = useMutation({ mutationFn: () => updateNote(orgId, clientId, note.id, { pinned: !note.pinned }), onSuccess: done });
  const del = useMutation({ mutationFn: () => deleteNote(orgId, clientId, note.id), onSuccess: async () => { await done(); setConfirm(false); } });
  const err = validateNoteBody(body);
  const error = edit.error ?? pin.error;

  return (
    <li className="rounded-lg border border-ops-border bg-ops-surface p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ops-ink-muted">
        <span className="font-bold text-ops-ink">{noteAuthorLabel(note.author, tr("b2b.member.unnamed", "Team member"), tr("b2b.clients.note.formerAuthor", "Former team member"))}</span>
        <span>{shortDate(note.createdAt)}</span>
        {note.editedAt && <span>{tr("b2b.clients.note.edited", "Edited")}</span>}
        {note.pinned && <span className="inline-flex items-center gap-1 font-bold text-ops-ink"><Pin className="h-3 w-3" aria-hidden="true" />{tr("b2b.clients.note.pinned", "Pinned")}</span>}
      </div>
      {editing ? (
        <form className="mt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); if (!err && !offline) edit.mutate(); }}>
          <label htmlFor={`edit-${note.id}`} className="sr-only">{tr("b2b.clients.note.editLabel", "Edit note")}</label>
          <textarea id={`edit-${note.id}`} rows={3} value={body} maxLength={NOTE_MAX} onChange={(e) => setBody(e.target.value)} className={`${inputCls} py-2`} />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={!!err || edit.isPending || offline} className={btnPrimary}>{tr("b2b.common.save", "Save")}</button>
            <button type="button" onClick={() => { setEditing(false); setBody(note.body); }} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>
          </div>
        </form>
      ) : <p className="mt-2 whitespace-pre-line break-words text-ops-ink">{note.body}</p>}
      {error && <div className="mt-2"><ErrorAlert message={setupErrorMessage(error, tr)} /></div>}
      {!editing && (canEditNote(note) || canDeleteNote(note) || canPinNote(can)) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {canEditNote(note) && <button type="button" disabled={offline} onClick={() => setEditing(true)} className={btnSecondary}>{tr("b2b.common.edit", "Edit")}</button>}
          {canPinNote(can) && <button type="button" disabled={offline || pin.isPending} onClick={() => pin.mutate()} className={btnSecondary}>{note.pinned ? <PinOff className="h-4 w-4" aria-hidden="true" /> : <Pin className="h-4 w-4" aria-hidden="true" />}{note.pinned ? tr("b2b.clients.note.unpin", "Unpin") : tr("b2b.clients.note.pin", "Pin")}</button>}
          {canDeleteNote(note) && <button type="button" disabled={offline} onClick={() => setConfirm(true)} className={btnSecondary}>{tr("b2b.common.delete", "Delete")}</button>}
        </div>
      )}
      {confirm && (
        <Modal open title={tr("b2b.clients.note.deleteTitle", "Delete this note?")} onClose={() => setConfirm(false)}>
          <blockquote className="mb-4 border-l-4 border-ops-border-strong pl-3 text-sm text-ops-ink">{noteExcerpt(note.body)}</blockquote>
          {del.isError && <div className="mb-4"><ErrorAlert message={setupErrorMessage(del.error, tr)} /></div>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setConfirm(false)} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>
            <button type="button" disabled={del.isPending || offline} onClick={() => del.mutate()} className={btnDanger}>{tr("b2b.common.delete", "Delete")}</button>
          </div>
        </Modal>
      )}
    </li>
  );
}
