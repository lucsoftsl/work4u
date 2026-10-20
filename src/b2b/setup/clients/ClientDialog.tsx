"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTr } from "@/b2b/setup/i18n";
import { createClient, setClientTags, updateClient, type Client } from "@/b2b/setup/api";
import { isB2bError } from "@/b2b/api/client";
import { createLocation } from "@/b2b/api/catalog";
import type { CustomerLocation } from "@/b2b/api/catalog-types";
import { clientFormErrors, formErrorsFrom } from "@/b2b/setup/errors";
import { useOnlineStatus } from "@/b2b/setup/useOnlineStatus";
import { EMPTY_CUSTOMER_FORM, EMPTY_LOCATION_FORM, locationInput, validateCustomer, type CustomerForm, type LocationForm } from "@/b2b/lib/catalog";
import { clearSessionDrafts, useSessionState } from "@/b2b/lib/useSessionState";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, Field, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { TagsInput } from "./TagsInput";
import { useFocusFirstInvalid } from "@/b2b/setup/useFocusFirstInvalid";

type Existing = Pick<Client, "id" | "name" | "type" | "email" | "phone" | "billingAddress" | "externalId" | "tags">;
export interface PickedClient { id: string; name: string }
interface Props {
  orgId: string;
  client?: Existing;
  onClose: () => void;
  onSaved?: (c: Client, location?: CustomerLocation) => void;
  /** Create Job: start with the name typed in the client search. */
  initialName?: string;
  /** Create Job: offer an optional first location, created right after the client. */
  withLocation?: boolean;
  /** Create Job: when the API says the client probably exists, "Use this client" picks it instead of opening its page. */
  onUseExisting?: (c: PickedClient) => void;
  /** Keeps what was typed in sessionStorage until saved (reload / accidental close). */
  draftKey?: string;
}

export function ClientDialog(props: Props) {
  const { tr } = useTr();
  const title = props.client ? tr("b2b.clients.dialog.edit", "Edit {name}", { name: props.client.name }) : tr("b2b.clients.add", "Add client");
  return <Modal open title={title} onClose={props.onClose}><ClientForm {...props} /></Modal>;
}

type FirstLocation = Pick<LocationForm, "label" | "addressLine" | "city" | "postalCode">;
const EMPTY_FIRST: FirstLocation = { label: "", addressLine: "", city: "", postalCode: "" };
const hasAny = (l: FirstLocation) => Object.values(l).some((v) => v.trim() !== "");
const nul = (s: string) => (s.trim() ? s.trim() : null);

function ClientForm({ orgId, client, onClose, onSaved, initialName, withLocation, onUseExisting, draftKey }: Props) {
  const { tr } = useTr();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const key = client ? undefined : draftKey;
  const [f, setF] = useSessionState<CustomerForm>(key && `${key}:form`, () => (client
    ? { name: client.name, type: client.type, email: client.email ?? "", phone: client.phone ?? "", billingAddress: client.billingAddress ?? "", notes: "" }
    : { ...EMPTY_CUSTOMER_FORM, name: initialName?.trim() ?? "" }));
  const [externalId, setExternalId] = useSessionState(key && `${key}:externalId`, client?.externalId ?? "");
  const [tags, setTags] = useSessionState<string[]>(key && `${key}:tags`, client?.tags ?? []);
  const [loc, setLoc] = useSessionState<FirstLocation>(key && `${key}:location`, EMPTY_FIRST);
  // A new client saved whose tags or first location failed: retrying saves only those, never a second client.
  const [created, setCreated] = useSessionState<Client | null>(key && `${key}:created`, null);
  const [failedStep, setFailedStep] = useState<"client" | "tags" | "location" | null>(null);
  const [touched, setTouched] = useState(false);
  const { ref: formRef, focusFirstInvalid } = useFocusFirstInvalid<HTMLFormElement>();
  const local = touched ? validateCustomer(f, tr) : {};
  const locLocal = touched && withLocation && hasAny(loc) && !loc.addressLine.trim() ? { addressLine: tr("b2b.locations.err.address", "Enter the street address.") } : {};
  const set = <K extends keyof CustomerForm>(k: K, v: CustomerForm[K]) => setF((p) => ({ ...p, [k]: v }));
  const setL = (k: keyof FirstLocation, v: string) => setLoc((p) => ({ ...p, [k]: v }));

  const finish = async (c: Client, location?: CustomerLocation) => {
    await qc.invalidateQueries({ queryKey: ["org", orgId, "customers"] });
    await qc.invalidateQueries({ queryKey: ["org", orgId, "customer"] });
    if (key) clearSessionDrafts(key);
    onSaved?.(c, location);
    onClose();
  };

  const save = useMutation({
    // `allowDuplicate`: "Create anyway", re-sent after the API reported a client that looks the same (DUPLICATE_CUSTOMER).
    mutationFn: async (opts?: { allowDuplicate?: boolean }) => {
      let saved = created;
      if (!saved) {
        setFailedStep("client");
        const body = { name: f.name.trim(), type: f.type, email: nul(f.email), phone: nul(f.phone), billingAddress: nul(f.billingAddress), externalId: nul(externalId) };
        saved = client ? await updateClient(orgId, client.id, body) : await createClient(orgId, opts?.allowDuplicate ? { ...body, allowDuplicate: true } : body);
        if (!client) setCreated(saved);
      }
      const tagsChanged = client ? tags.join("\u0000") !== client.tags.join("\u0000") : tags.length > 0;
      if (tagsChanged) { setFailedStep("tags"); await setClientTags(orgId, saved.id, tags); } // PUT: safe to repeat
      saved = { ...saved, tags };
      let location: CustomerLocation | undefined;
      if (!client && withLocation && hasAny(loc)) {
        setFailedStep("location");
        const label = loc.label.trim() || tr("b2b.clients.firstLocation.defaultLabel", "Main address");
        location = await createLocation(orgId, saved.id, locationInput({ ...EMPTY_LOCATION_FORM, ...loc, label }));
      }
      setFailedStep(null);
      return { saved, location };
    },
    onSuccess: ({ saved, location }) => finish(saved, location),
  });

  const clientErrors = failedStep === "client" || failedStep === "tags" ? clientFormErrors(save.error, tr) : { fields: {} };
  const locationErrors = failedStep === "location"
    ? formErrorsFrom(save.error, { keys: ["label", "addressLine", "city", "postalCode"] as const, text: { addressLine: tr("b2b.locations.err.address", "Enter the street address.") } }, tr)
    : { fields: {} as Partial<Record<keyof FirstLocation, string>> };
  const errors = { ...local, ...clientErrors.fields } as Record<string, string | undefined>;
  const locErrors = { ...locLocal, ...locationErrors.fields } as Record<string, string | undefined>;
  // Once a failed save has rendered its field error (duplicate Client ID, invalid phone…), focus that field.
  useEffect(() => { if (save.error) focusFirstInvalid(); }, [save.error, focusFirstInvalid]);

  const matches = save.isError && failedStep === "client" && isB2bError(save.error) && save.error.code === "DUPLICATE_CUSTOMER" ? duplicateMatches(save.error.body.matches) : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setTouched(true);
    const missingAddress = withLocation && hasAny(loc) && !loc.addressLine.trim();
    if (!created && Object.keys(validateCustomer(f, tr)).length > 0) { focusFirstInvalid(); return; }
    if (missingAddress) { focusFirstInvalid(); return; }
    if (!online) return;
    save.mutate(undefined);
  };

  const segment = (value: CustomerForm["type"], label: string) => (
    <label className={`inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded border px-3 text-sm font-bold focus-within:outline focus-within:outline-2 ${f.type === value ? "border-ops-ink bg-ops-ink text-white" : "border-ops-border-strong bg-ops-surface text-ops-ink"}`}>
      <input type="radio" name="client-type" value={value} checked={f.type === value} onChange={() => set("type", value)} className="sr-only" />{label}
    </label>
  );

  if (matches.length > 0) {
    const pick = (m: DuplicateMatch) => { if (key) clearSessionDrafts(key); onUseExisting?.({ id: m.id, name: m.name }); onClose(); };
    return <DuplicatePanel orgId={orgId} matches={matches} canPick={!!onUseExisting} onPick={pick} onClose={onClose} onBack={() => save.reset()} onAnyway={() => save.mutate({ allowDuplicate: true })} busy={save.isPending} />;
  }

  return (
    <form ref={formRef} noValidate className="space-y-3" onSubmit={(e) => void submit(e)}>
      {created && save.isError && <p role="alert" className="rounded border border-ops-border-strong bg-ops-canvas p-3 text-sm font-bold text-ops-ink">{failedStep === "tags"
        ? tr("b2b.clients.partial.tags", "The client {name} was saved. Only the tags failed: fix them and save again, or skip them.", { name: created.name })
        : tr("b2b.clients.firstLocation.clientSaved", "The client {name} was saved. Only the location failed: fix it and save again, or skip it.", { name: created.name })}</p>}
      <fieldset disabled={!!created} className="space-y-3">
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
          {(p) => <input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid} value={externalId} maxLength={100} onChange={(e) => setExternalId(e.target.value)} className={inputCls} />}
        </Field>
      </fieldset>
      <TagsInput tags={tags} onChange={setTags} />
      {withLocation && !client ? (
        <fieldset className="space-y-3 border-t border-ops-border pt-3">
          <legend className="pt-3 text-sm font-bold text-ops-ink">{tr("b2b.clients.firstLocation.title", "First location (optional)")}</legend>
          <p className="text-xs text-ops-ink-muted">{tr("b2b.clients.firstLocation.hint", "Where the work happens. Jobs need a location; you can also add it later.")}</p>
          <Field label={tr("b2b.locations.label", "Label (for example Head office)")} error={locErrors.label}>
            {(p) => <input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid} maxLength={200} value={loc.label} onChange={(e) => setL("label", e.target.value)} className={inputCls} />}
          </Field>
          <Field label={tr("b2b.locations.address", "Address")} error={locErrors.addressLine}>
            {(p) => <input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid} maxLength={300} autoComplete="street-address" value={loc.addressLine} onChange={(e) => setL("addressLine", e.target.value)} className={inputCls} />}
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={tr("b2b.locations.city", "City")} error={locErrors.city}>
              {(p) => <input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid} autoComplete="address-level2" value={loc.city} onChange={(e) => setL("city", e.target.value)} className={inputCls} />}
            </Field>
            <Field label={tr("b2b.locations.postal", "Postal code")} error={locErrors.postalCode}>
              {(p) => <input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid} maxLength={20} autoComplete="postal-code" value={loc.postalCode} onChange={(e) => setL("postalCode", e.target.value)} className={inputCls} />}
            </Field>
          </div>
        </fieldset>
      ) : !client ? <p className="text-sm text-ops-ink-muted">{tr("b2b.clients.dialog.contactsHint", "Contacts and addresses are added on the client page after saving.")}</p> : null}
      {!online && <p role="status" className="text-sm font-bold text-ops-ink">{tr("b2b.clients.offline", "You're offline. Reconnect to save changes.")}</p>}
      {clientErrors.banner && matches.length === 0 && <ErrorAlert message={clientErrors.banner} />}
      {"banner" in locationErrors && locationErrors.banner && <ErrorAlert message={locationErrors.banner} />}
      <div className="flex flex-wrap justify-end gap-2">
        {created
          ? <button type="button" onClick={() => void finish(created)} className={btnSecondary}>{failedStep === "tags" ? tr("b2b.clients.partial.skipTags", "Skip the tags") : tr("b2b.clients.firstLocation.skip", "Skip the location")}</button>
          : <button type="button" onClick={onClose} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>}
        <button type="submit" disabled={save.isPending || !online} className={btnPrimary}>{save.isPending ? tr("b2b.common.saving", "Saving…") : tr("b2b.common.save", "Save")}</button>
      </div>
    </form>
  );
}

/** One client the API found to look the same (DUPLICATE_CUSTOMER). Email and phone arrive masked: they are shown as received. */
export interface DuplicateMatch { id: string; name: string; email: string | null; phone: string | null; reasons: string[] }

export function duplicateMatches(raw: unknown): DuplicateMatch[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x): DuplicateMatch[] => {
    const m = x as Partial<DuplicateMatch> | null;
    if (!m || typeof m.id !== "string" || typeof m.name !== "string") return [];
    return [{ id: m.id, name: m.name, email: typeof m.email === "string" ? m.email : null, phone: typeof m.phone === "string" ? m.phone : null, reasons: Array.isArray(m.reasons) ? m.reasons.filter((r): r is string => typeof r === "string") : [] }];
  });
}

function DuplicatePanel({ orgId, matches, canPick, onPick, onClose, onBack, onAnyway, busy }: { orgId: string; matches: DuplicateMatch[]; canPick: boolean; onPick: (m: DuplicateMatch) => void; onClose: () => void; onBack: () => void; onAnyway: () => void; busy: boolean }) {
  const { tr } = useTr();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const reasonText = (r: string) => r === "EMAIL" ? tr("b2b.newJob.inline.dup.reason.EMAIL", "Same email address") : r === "PHONE" ? tr("b2b.newJob.inline.dup.reason.PHONE", "Same phone number") : r === "NAME" ? tr("b2b.newJob.inline.dup.reason.NAME", "Same name") : r;
  return (
    <div className="space-y-4">
      <h3 ref={heading} tabIndex={-1} className="text-base font-bold text-ops-ink focus:outline-none">{tr("b2b.newJob.inline.dup.title", "This client may already exist")}</h3>
      <p className="text-sm text-ops-ink-muted">{tr("b2b.clients.dup.intro", "Use the one you already have, so the job history stays in one place, or create a new client anyway.")}</p>
      <ul className="space-y-2">
        {matches.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-ops-border-strong p-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-bold text-ops-ink">{m.name}</p>
              {m.email || m.phone ? <p className="break-words text-xs text-ops-ink-muted">{[m.email, m.phone].filter(Boolean).join(" · ")}</p> : null}
              {m.reasons.length ? <p className="text-xs text-ops-ink">{m.reasons.map(reasonText).join(" · ")}</p> : null}
            </div>
            {canPick
              ? <button type="button" onClick={() => onPick(m)} disabled={busy} className={btnPrimary}>{tr("b2b.newJob.inline.dup.use", "Use this client")}</button>
              : <Link href={`/ops/${encodeURIComponent(orgId)}/customers/${encodeURIComponent(m.id)}`} onClick={onClose} className={btnPrimary}>{tr("b2b.clients.dup.open", "Open this client")}</Link>}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onBack} disabled={busy} className={btnSecondary}>{tr("b2b.newJob.inline.dup.back", "Back to the form")}</button>
        <button type="button" onClick={onAnyway} disabled={busy} aria-busy={busy || undefined} className={btnSecondary}>{tr("b2b.newJob.inline.dup.anyway", "Create anyway")}</button>
      </div>
    </div>
  );
}
