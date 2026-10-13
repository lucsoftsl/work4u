"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import type { Customer } from "@/b2b/api/catalog-types";
import { createCustomer, updateCustomer } from "@/b2b/api/catalog";
import { EMPTY_CUSTOMER_FORM, catalogErrorMessage, customerInput, customerToForm, validateCustomer, type CustomerForm } from "@/b2b/lib/catalog";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, Field, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";

interface Props { orgId: string; customer?: Customer; onClose: () => void; onSaved?: (c: Customer) => void }

export function CustomerDialog(props: Props) {
  return (
    <Modal open title={props.customer ? `Edit ${props.customer.name}` : "New customer"} onClose={props.onClose}>
      <Form {...props} />
    </Modal>
  );
}

function Form({ orgId, customer, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [f, setF] = useState<CustomerForm>(customer ? customerToForm(customer) : EMPTY_CUSTOMER_FORM);
  const [touched, setTouched] = useState(false);
  const errors = touched ? validateCustomer(f) : {};
  const set = <K extends keyof CustomerForm>(k: K, v: CustomerForm[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const save = useMutation({
    mutationFn: () => (customer ? updateCustomer(orgId, customer.id, customerInput(f)) : createCustomer(orgId, customerInput(f))),
    onSuccess: async (c) => {
      await qc.invalidateQueries({ queryKey: ["org", orgId, "customers"] });
      await qc.invalidateQueries({ queryKey: ["org", orgId, "customer"] });
      onSaved?.(c);
      onClose();
    },
  });

  return (
    <form noValidate className="space-y-3" onSubmit={(e) => { e.preventDefault(); setTouched(true); if (Object.keys(validateCustomer(f)).length === 0) save.mutate(); }}>
      <Field label={t("b2b.customers.name", "Name")} error={errors.name}>
        {(p) => <input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid} autoFocus value={f.name} maxLength={200} onChange={(e) => set("name", e.target.value)} className={inputCls} />}
      </Field>
      <Field label={t("b2b.customers.type", "Type")}>
        {(p) => (
          <select id={p.id} value={f.type} onChange={(e) => set("type", e.target.value as CustomerForm["type"])} className={inputCls}>
            <option value="COMPANY">{t("b2b.customers.company", "Company")}</option>
            <option value="PERSON">{t("b2b.customers.person", "Person")}</option>
          </select>
        )}
      </Field>
      <Field label={t("b2b.customers.email", "Email")} error={errors.email}>
        {(p) => <input id={p.id} type="email" aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />}
      </Field>
      <Field label={t("b2b.customers.phone", "Phone")} error={errors.phone}>
        {(p) => <input id={p.id} type="tel" aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />}
      </Field>
      <Field label={t("b2b.customers.billing", "Billing address")} error={errors.billingAddress}>
        {(p) => <textarea id={p.id} rows={2} aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f.billingAddress} onChange={(e) => set("billingAddress", e.target.value)} className={`${inputCls} py-2`} />}
      </Field>
      <Field label={t("b2b.customers.notes", "Notes")} error={errors.notes}>
        {(p) => <textarea id={p.id} rows={3} aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f.notes} onChange={(e) => set("notes", e.target.value)} className={`${inputCls} py-2`} />}
      </Field>
      {save.isError && <ErrorAlert message={catalogErrorMessage(save.error, "customer")} />}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>{t("b2b.common.cancel", "Cancel")}</button>
        <button type="submit" disabled={save.isPending} className={btnPrimary}>{save.isPending ? t("b2b.common.saving", "Saving…") : t("b2b.common.save", "Save")}</button>
      </div>
    </form>
  );
}
