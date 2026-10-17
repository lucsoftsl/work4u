"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTr } from "@/b2b/setup/i18n";
import { deleteContact, type ClientContact } from "@/b2b/setup/api";
import { setupErrorMessage } from "@/b2b/setup/errors";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, btnDanger, btnSecondary } from "@/b2b/components/catalog/ui";
import { ContactDialog } from "./ContactDialog";

export const MAX_CONTACTS = 50;
type Dlg = { kind: "form"; contact?: ClientContact } | { kind: "delete"; contact: ClientContact } | null;

export function ContactsCard({ orgId, clientId, contacts, canManage, offline }: { orgId: string; clientId: string; contacts: ClientContact[]; canManage: boolean; offline: boolean }) {
  const { tr } = useTr();
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<Dlg>(null);
  const del = useMutation({
    mutationFn: (id: string) => deleteContact(orgId, clientId, id),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["org", orgId, "customer", clientId] }); setDlg(null); },
  });
  const atMax = contacts.length >= MAX_CONTACTS;
  return (
    <section aria-labelledby="contacts-h" className="rounded-lg border border-ops-border bg-ops-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="contacts-h" className="text-lg font-bold text-ops-ink">{tr("b2b.clients.contacts", "Contacts")}</h2>
        {canManage && <button type="button" disabled={offline || atMax} onClick={() => setDlg({ kind: "form" })} className={btnSecondary}><Plus className="h-4 w-4" aria-hidden="true" />{tr("b2b.clients.contact.add", "Add contact")}</button>}
      </div>
      {atMax && <p className="mt-2 text-sm text-ops-ink-muted">{tr("b2b.clients.contact.max", "You can add up to {n} contacts.", { n: MAX_CONTACTS })}</p>}
      {contacts.length === 0 ? <p className="mt-3 text-sm text-ops-ink-muted">{tr("b2b.clients.contact.empty", "No contacts yet.")}</p> : (
        <ul className="mt-3 divide-y divide-ops-border">
          {contacts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="font-bold text-ops-ink">{c.name}{c.isPrimary && <span className="ml-2 rounded bg-sig-green-tint px-1.5 py-0.5 text-xs font-bold text-sig-green-ink">{tr("b2b.clients.contact.main", "Main")}</span>}</p>
                <p className="break-words text-sm text-ops-ink-muted">{[c.role, c.email, c.phone].filter(Boolean).join(" · ")}</p>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <button type="button" disabled={offline} onClick={() => setDlg({ kind: "form", contact: c })} className={btnSecondary}><Pencil className="h-4 w-4" aria-hidden="true" />{tr("b2b.common.edit", "Edit")}<span className="sr-only"> {c.name}</span></button>
                  <button type="button" disabled={offline} onClick={() => setDlg({ kind: "delete", contact: c })} className={btnSecondary}><Trash2 className="h-4 w-4" aria-hidden="true" />{tr("b2b.common.delete", "Delete")}<span className="sr-only"> {c.name}</span></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {dlg?.kind === "form" && <ContactDialog orgId={orgId} clientId={clientId} contact={dlg.contact} onClose={() => setDlg(null)} />}
      {dlg?.kind === "delete" && (
        <Modal open title={tr("b2b.clients.contact.deleteTitle", "Delete {name}?", { name: dlg.contact.name })} onClose={() => setDlg(null)}>
          <p className="mb-4 text-sm text-ops-ink">{tr("b2b.clients.contact.deleteBody", "This removes the contact from the client.")}</p>
          {del.isError && <div className="mb-4"><ErrorAlert message={setupErrorMessage(del.error, tr)} /></div>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setDlg(null)} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>
            <button type="button" disabled={del.isPending || offline} onClick={() => del.mutate(dlg.contact.id)} className={btnDanger}>{tr("b2b.common.delete", "Delete")}</button>
          </div>
        </Modal>
      )}
    </section>
  );
}
