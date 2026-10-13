"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import type { CustomerLocation } from "@/b2b/api/catalog-types";
import { createLocation, updateLocation } from "@/b2b/api/catalog";
import { EMPTY_LOCATION_FORM, catalogErrorMessage, locationInput, locationToForm, validateLocation, type LocationForm } from "@/b2b/lib/catalog";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, Field, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";

interface Props { orgId: string; customerId: string; location?: CustomerLocation; onClose: () => void }

export function LocationDialog(props: Props) {
  return (
    <Modal open title={props.location ? `Edit ${props.location.label}` : "Add location"} onClose={props.onClose}>
      <Form {...props} />
    </Modal>
  );
}

function Form({ orgId, customerId, location, onClose }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [f, setF] = useState<LocationForm>(location ? locationToForm(location) : EMPTY_LOCATION_FORM);
  const [touched, setTouched] = useState(false);
  const errors = touched ? validateLocation(f) : {};
  const set = (k: keyof LocationForm, v: string) => setF((prev) => ({ ...prev, [k]: v }));
  const save = useMutation({
    mutationFn: () => (location ? updateLocation(orgId, customerId, location.id, locationInput(f)) : createLocation(orgId, customerId, locationInput(f))),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["org", orgId, "customer", customerId] }); onClose(); },
  });
  const text = (k: keyof LocationForm, label: string, extra?: { autoFocus?: boolean; maxLength?: number; inputMode?: "decimal" }) => (
    <Field label={label} error={errors[k]}>
      {(p) => <input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f[k]} onChange={(e) => set(k, e.target.value)} className={inputCls} {...extra} />}
    </Field>
  );
  const area = (k: keyof LocationForm, label: string) => (
    <Field label={label} error={errors[k]}>
      {(p) => <textarea id={p.id} rows={3} aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f[k]} onChange={(e) => set(k, e.target.value)} className={`${inputCls} py-2`} />}
    </Field>
  );
  return (
    <form noValidate className="space-y-3" onSubmit={(e) => { e.preventDefault(); setTouched(true); if (Object.keys(validateLocation(f)).length === 0) save.mutate(); }}>
      {text("label", t("b2b.locations.label", "Label (for example Head office)"), { autoFocus: true, maxLength: 200 })}
      {text("addressLine", t("b2b.locations.address", "Address"), { maxLength: 300 })}
      <div className="grid grid-cols-2 gap-3">
        {text("city", t("b2b.locations.city", "City"))}
        {text("postalCode", t("b2b.locations.postal", "Postal code"), { maxLength: 20 })}
        {text("country", t("b2b.locations.country", "Country code"), { maxLength: 2 })}
        <div />
        {text("latitude", t("b2b.locations.lat", "Latitude"), { inputMode: "decimal" })}
        {text("longitude", t("b2b.locations.lng", "Longitude"), { inputMode: "decimal" })}
      </div>
      {area("accessInstructions", t("b2b.locations.access", "Access instructions"))}
      {area("safetyInstructions", t("b2b.locations.safety", "Safety instructions"))}
      {save.isError && <ErrorAlert message={catalogErrorMessage(save.error, "location")} />}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>{t("b2b.common.cancel", "Cancel")}</button>
        <button type="submit" disabled={save.isPending} className={btnPrimary}>{save.isPending ? t("b2b.common.saving", "Saving…") : t("b2b.common.save", "Save")}</button>
      </div>
    </form>
  );
}
