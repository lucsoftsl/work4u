"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CustomerLocation } from "@/b2b/api/catalog-types";
import { createLocation, updateLocation } from "@/b2b/api/catalog";
import { EMPTY_LOCATION_FORM, catalogErrorMessage, locationInput, locationToForm, validateLocation, type LocationForm } from "@/b2b/lib/catalog";
import { useSessionState, clearSessionDrafts } from "@/b2b/lib/useSessionState";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, Field, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { formErrorsFrom } from "@/b2b/setup/errors";
import { useTr } from "@/b2b/setup/i18n";
import { useFocusFirstInvalid } from "@/b2b/setup/useFocusFirstInvalid";

interface Props {
  orgId: string;
  customerId: string;
  location?: CustomerLocation;
  onClose: () => void;
  /** Called with the saved location before the dialog closes (Create Job selects it). */
  onSaved?: (location: CustomerLocation) => void;
  /** Keeps what was typed in sessionStorage until saved, so a reload or an accidental close loses nothing. */
  draftKey?: string;
}

const LOCATION_FIELDS = ["label", "addressLine", "city", "postalCode", "country", "latitude", "longitude", "accessInstructions", "safetyInstructions"] as const;

export function LocationDialog(props: Props) {
  const { tr } = useTr();
  const title = props.location ? tr("b2b.locations.editTitle", "Edit {name}", { name: props.location.label }) : tr("b2b.locations.addTitle", "Add location");
  return (
    <Modal open title={title} onClose={props.onClose}>
      <Form {...props} />
    </Modal>
  );
}

function Form({ orgId, customerId, location, onClose, onSaved, draftKey }: Props) {
  const { tr } = useTr();
  const qc = useQueryClient();
  const [f, setF] = useSessionState<LocationForm>(location ? undefined : draftKey, () => (location ? locationToForm(location) : EMPTY_LOCATION_FORM));
  const [touched, setTouched] = useState(false);
  const { ref: formRef, focusFirstInvalid } = useFocusFirstInvalid<HTMLFormElement>();
  const set = (k: keyof LocationForm, v: string) => { setF((prev) => ({ ...prev, [k]: v })); if (save.isError) save.reset(); };
  const save = useMutation({
    mutationFn: () => (location ? updateLocation(orgId, customerId, location.id, locationInput(f)) : createLocation(orgId, customerId, locationInput(f))),
    onSuccess: async (saved) => {
      await qc.invalidateQueries({ queryKey: ["org", orgId, "customer", customerId] });
      if (draftKey) clearSessionDrafts(draftKey);
      onSaved?.(saved);
      onClose();
    },
  });
  useEffect(() => { if (save.error) focusFirstInvalid(); }, [save.error, focusFirstInvalid]);

  const TEXT: Record<keyof LocationForm, string> = {
    label: tr("b2b.locations.err.label", "Enter a label, for example Head office."),
    addressLine: tr("b2b.locations.err.address", "Enter the street address."),
    city: tr("b2b.locations.err.city", "Use up to 120 characters."),
    postalCode: tr("b2b.locations.err.postal", "Use up to 20 characters."),
    country: tr("b2b.locations.err.country", "Use a 2-letter country code, for example ES."),
    latitude: tr("b2b.locations.err.lat", "Latitude must be between -90 and 90."),
    longitude: tr("b2b.locations.err.lng", "Longitude must be between -180 and 180."),
    accessInstructions: tr("b2b.locations.err.long", "Use up to 5000 characters."),
    safetyInstructions: tr("b2b.locations.err.long", "Use up to 5000 characters."),
  };
  const local = touched ? validateLocation(f, tr) : {};
  const server = formErrorsFrom(save.error, { keys: LOCATION_FIELDS, text: TEXT }, tr, (e) => catalogErrorMessage(e, "location", tr));
  const error = (k: keyof LocationForm): string | undefined => server.fields[k] ?? (local[k] ? TEXT[k] : undefined);

  const text = (k: keyof LocationForm, label: string, extra?: { autoFocus?: boolean; maxLength?: number; inputMode?: "decimal"; autoComplete?: string }) => (
    <Field label={label} error={error(k)}>
      {(p) => <input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f[k]} onChange={(e) => set(k, e.target.value)} className={inputCls} {...extra} />}
    </Field>
  );
  const area = (k: keyof LocationForm, label: string) => (
    <Field label={label} error={error(k)}>
      {(p) => <textarea id={p.id} rows={3} aria-describedby={p.describedBy} aria-invalid={p.invalid} value={f[k]} onChange={(e) => set(k, e.target.value)} className={`${inputCls} py-2`} />}
    </Field>
  );
  return (
    <form ref={formRef} noValidate className="space-y-3" onSubmit={(e) => {
      e.preventDefault(); setTouched(true);
      if (Object.keys(validateLocation(f, tr)).length > 0) { focusFirstInvalid(); return; }
      save.mutate();
    }}>
      {text("label", tr("b2b.locations.label", "Label (for example Head office)"), { autoFocus: true, maxLength: 200 })}
      {text("addressLine", tr("b2b.locations.address", "Address"), { maxLength: 300, autoComplete: "street-address" })}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {text("city", tr("b2b.locations.city", "City"), { autoComplete: "address-level2" })}
        {text("postalCode", tr("b2b.locations.postal", "Postal code"), { maxLength: 20, autoComplete: "postal-code" })}
        {text("country", tr("b2b.locations.country", "Country code"), { maxLength: 2 })}
        <div className="hidden sm:block" />
        {text("latitude", tr("b2b.locations.lat", "Latitude"), { inputMode: "decimal" })}
        {text("longitude", tr("b2b.locations.lng", "Longitude"), { inputMode: "decimal" })}
      </div>
      {area("accessInstructions", tr("b2b.locations.access", "Access instructions"))}
      {area("safetyInstructions", tr("b2b.locations.safety", "Safety instructions"))}
      {server.banner && <ErrorAlert message={server.banner} />}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>
        <button type="submit" disabled={save.isPending} className={btnPrimary}>{save.isPending ? tr("b2b.common.saving", "Saving…") : tr("b2b.common.save", "Save")}</button>
      </div>
    </form>
  );
}
