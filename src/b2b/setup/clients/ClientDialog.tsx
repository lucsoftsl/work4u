"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTr } from "@/b2b/setup/i18n";
import { createClient, setClientTags, updateClient, type Client } from "@/b2b/setup/api";
import { clientFieldErrors, setupErrorMessage } from "@/b2b/setup/errors";
import { useOnlineStatus } from "@/b2b/setup/useOnlineStatus";
import { EMPTY_CUSTOMER_FORM, validateCustomer, type CustomerForm } from "@/b2b/lib/catalog";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, Field, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { TagsInput } from "./TagsInput";

type Existing = Pick<Client, "id" | "name" | "type" | "email" | "phone" | "billingAddress" | "externalId" | "tags">;
interface Props { orgId: string; client?: Existing; onClose: () => void; onSaved?: (c: Client) => void }

export function ClientDialog(props: Props) {
  const { tr } = useTr();
  const title = props.client ? tr("b2b.clients.dialog.edit", "Edit {name}", { name: props.client.name }) : tr("b2b.clients.add", "Add client");
  return <Modal open title={title} onClose={props.onClose}><ClientForm {...props} /></Modal>;
}

function ClientForm({ orgId, client, onClose, onSaved }: Props) {
  const { tr } = useTr();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const [f, setF] = useState<CustomerForm>(client
    ? { name: client.name, type: client.type, email: client.email ?? "", phone: client.phone ?? "", billingAddress: client.billingAddress ?? "", notes: "" }
    : EMPTY_CUSTOMER_FORM);
  const [externalId, setExternalId] = useState(client?.externalId ?? "");
  const [tags, setTags] = useState<string[]>(client?.tags ?? []);
  const [touched, setTouched] = useState(false);
  const local = touched ? validateCustomer(f) : {};
  const set = <K extends keyof CustomerForm>(k: K, v: CustomerForm[K]) => setF((p) => ({ ...p, [k]: v }));
  const nul = (s: string) => (s.trim() ? s.trim() : null);

  const save = useMutation({
    mutationFn: async () => {
      const body = { name: f.name.trim(), type: f.type, email: nul(f.email), phone: nul(f.phone), billingAddress: nul(f.billingAddress), externalId: nul(externalId) };
      const saved = client ? await updateClient(orgId, client.id, body) : await createClient(orgId, body);
      const tagsChanged = client ? tags.join("\u0000") !== client.tags.join("\u0000") : tags.length > 0;
      if (tagsChanged) await setClientTags(orgId, saved.id, tags);
      return { ...saved, tags };
    },
    onSuccess: async (c) => {
      await qc.invalidateQueries({ queryKey: ["org", orgId, "customers"] });
      await qc.invalidateQueries({ queryKey: ["org", orgId, "customer"] });
      onSaved?.(c);
      onClose();
    },
  });

  const server = save.isError ? clientFieldErrors(save.error, tr) : {};
  const errors = { ...local, ...server } as Record<string, string | undefined>;
  const segment = (value: CustomerForm["type"], label: string) => (
    <label className={`inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded border px-3 text-sm font-bold focus-within:outline focus-within:outline-2 ${f.type === value ? "border-ops-ink bg-ops-ink text-white" : "border-ops-border-strong bg-ops-surface text-ops-ink"}`}>
      <input type="radio" name="client-type" value={value} checked={f.type === value} onChange={() => set("type", value)} className="sr-only" />{label}
    </label>
  );

  return (
    <form noValidate className="space-y-3" onSubmit={(e) => { e.preventDefault(); setTouched(true); if (online && Object.keys(validateCustomer(f)).length === 0) save.mutate(); }}>
      <fieldset className="space-y-1">
        <legend className="text-sm font-bold text-ops-ink">{tr("b2b.customers.type", "Type")}</legend>
        <div className="flex gap-2">{segment("COMPANY", tr("b2b.customers.company", "Company"))}{segment("PERSON", tr("b2b.customers.person", "Person"))}</div>
      </fieldset>
      <Field label={tr("b2b.customers.name", "Name")} error={errors.name}>
        {(p) => <input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid} autoFocus autoComplete="organization" value={f.name} maxLength={200} onChange={(e) => set("name", e.target.value)} className={inputCls} />}
      </Field>
      <Field label={tr("b2b.customers.email", "Email")} error={errors.email}>
        {(p) => <input id={p.id} type="email" autoComplete="email" aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />}
      </Field>
      <Field label={tr("b2b.customers.phone", "Phone")} error={errors.phone}>
        {(p) => <input id={p.id} type="tel" inputMode="tel" autoComplete="tel" aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />}
      </Field>
      <Field label={tr("b2b.customers.billing", "Billing address")} error={errors.billingAddress}>
        {(p) => <textarea id={p.id} rows={2} aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f.billingAddress} onChange={(e) => set("billingAddress", e.target.value)} className={`${inputCls} py-2`} />}
      </Field>
      <Field label={tr("b2b.clients.externalId", "Client ID")} error={errors.externalId} hint={tr("b2b.clients.externalIdHint", "Optional. Your own reference, for example from your accounting system.")}>
        {(p) => <input id={p.id} aria-describedby={p.describedBy} value={externalId} maxLength={100} onChange={(e) => setExternalId(e.target.value)} className={inputCls} />}
      </Field>
      <TagsInput tags={tags} onChange={setTags} />
      {!client && <p className="text-sm text-ops-ink-muted">{tr("b2b.clients.dialog.contactsHint", "Contacts and addresses are added on the client page after saving.")}</p>}
      {!online && <p role="status" className="text-sm font-bold text-ops-ink">{tr("b2b.clients.offline", "You're offline. Reconnect to save changes.")}</p>}
      {save.isError && Object.keys(server).length === 0 && <ErrorAlert message={setupErrorMessage(save.error, tr)} />}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>
        <button type="submit" disabled={save.isPending || !online} className={btnPrimary}>{save.isPending ? tr("b2b.common.saving", "Saving…") : tr("b2b.common.save", "Save")}</button>
      </div>
    </form>
  );
}
