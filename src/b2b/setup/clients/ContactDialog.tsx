"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTr } from "@/b2b/setup/i18n";
import { addContact, updateContact, type ClientContact, type ContactInput } from "@/b2b/setup/api";
import { formErrorsFrom } from "@/b2b/setup/errors";
import { isValidEmail } from "@/b2b/lib/email";
import { useFocusFirstInvalid } from "@/b2b/setup/useFocusFirstInvalid";
import { useOnlineStatus } from "@/b2b/setup/useOnlineStatus";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, Field, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";

interface Props { orgId: string; clientId: string; contact?: ClientContact; onClose: () => void }

export function ContactDialog(props: Props) {
  const { tr } = useTr();
  return (
    <Modal open title={props.contact ? tr("b2b.clients.contact.edit", "Edit contact") : tr("b2b.clients.contact.add", "Add contact")} onClose={props.onClose}>
      <ContactForm {...props} />
    </Modal>
  );
}

function ContactForm({ orgId, clientId, contact, onClose }: Props) {
  const { tr } = useTr();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const [f, setF] = useState({ name: contact?.name ?? "", role: contact?.role ?? "", email: contact?.email ?? "", phone: contact?.phone ?? "", isPrimary: contact?.isPrimary ?? false });
  const [touched, setTouched] = useState(false);
  const errors = {
    name: !f.name.trim() ? tr("b2b.clients.contact.err.name", "Enter a name.") : undefined,
    email: f.email.trim() && !isValidEmail(f.email) ? tr("b2b.clients.contact.err.email", "Enter a valid email address.") : undefined,
  };
  const invalid = !!(errors.name || errors.email);
  const { ref: formRef, focusFirstInvalid } = useFocusFirstInvalid<HTMLFormElement>();
  const nul = (s: string) => (s.trim() ? s.trim() : null);
  const save = useMutation({
    mutationFn: () => {
      const body: ContactInput = { name: f.name.trim(), role: nul(f.role), email: nul(f.email), phone: nul(f.phone), isPrimary: f.isPrimary };
      return contact ? updateContact(orgId, clientId, contact.id, body) : addContact(orgId, clientId, body);
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["org", orgId, "customer", clientId] }); onClose(); },
  });
  const set = (k: "name" | "role" | "email" | "phone", v: string) => { setF((p) => ({ ...p, [k]: v })); if (save.isError) save.reset(); };
  useEffect(() => { if (save.error) focusFirstInvalid(); }, [save.error, focusFirstInvalid]);
  // Every API field key on its field (c769b0c5); isPrimary has no message of its own, so it is named in the banner.
  const server = formErrorsFrom(save.error, {
    keys: ["name", "role", "email", "phone"] as const,
    text: {
      name: tr("b2b.clients.contact.err.name", "Enter a name."),
      role: tr("b2b.clients.contact.err.role", "Use up to 120 characters."),
      email: tr("b2b.clients.contact.err.email", "Enter a valid email address."),
      phone: tr("b2b.clients.err.phone", "Enter a valid phone number, e.g. +34 600 555 021."),
    },
    labels: { isPrimary: tr("b2b.clients.contact.primary", "Main contact") },
  }, tr);
  const shown = (k: "name" | "email") => server.fields[k] ?? (touched ? errors[k] : undefined);
  return (
    <form ref={formRef} noValidate className="space-y-3" onSubmit={(e) => { e.preventDefault(); setTouched(true); if (invalid) { focusFirstInvalid(); return; } if (online) save.mutate(); }}>
      <Field label={tr("b2b.customers.name", "Name")} error={shown("name")}>
        {(p) => <input id={p.id} autoFocus autoComplete="name" aria-describedby={p.describedBy} aria-invalid={p.invalid} maxLength={200} value={f.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />}
      </Field>
      <Field label={tr("b2b.clients.contact.role", "Role")} error={server.fields.role}>
        {(p) => <input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid} maxLength={120} value={f.role} onChange={(e) => set("role", e.target.value)} className={inputCls} />}
      </Field>
      <Field label={tr("b2b.customers.email", "Email")} error={shown("email")}>
        {(p) => <input id={p.id} type="email" autoComplete="email" aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />}
      </Field>
      <Field label={tr("b2b.customers.phone", "Phone")} error={server.fields.phone}>
        {(p) => <input id={p.id} type="tel" inputMode="tel" autoComplete="tel" aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />}
      </Field>
      <label className="flex min-h-[44px] items-center gap-3 text-sm text-ops-ink">
        <input type="checkbox" className="h-5 w-5" checked={f.isPrimary} onChange={(e) => setF((p) => ({ ...p, isPrimary: e.target.checked }))} />
        {tr("b2b.clients.contact.primary", "Main contact")}
      </label>
      {!online && <p role="status" className="text-sm font-bold text-ops-ink">{tr("b2b.clients.offline", "You're offline. Reconnect to save changes.")}</p>}
      {server.banner && <ErrorAlert message={server.banner} />}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>
        <button type="submit" disabled={save.isPending || !online} className={btnPrimary}>{save.isPending ? tr("b2b.common.saving", "Saving…") : tr("b2b.common.save", "Save")}</button>
      </div>
    </form>
  );
}
