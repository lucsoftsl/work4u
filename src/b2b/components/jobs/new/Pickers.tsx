"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { ck, getCustomer, listCustomers } from "@/b2b/api/catalog";
import type { Customer } from "@/b2b/api/catalog-types";
import { useOrg } from "@/b2b/context/OrgContext";
import { inputCls } from "@/b2b/components/catalog/ui";
import { LocationDialog } from "@/b2b/components/customers/LocationDialog";
import { ClientDialog } from "@/b2b/setup/clients/ClientDialog";
import { useTr } from "@/b2b/setup/i18n";
import { clearSessionDrafts, useSessionState } from "@/b2b/lib/useSessionState";
import { describedBy, fieldId, FormGroup } from "./FormField";

const SEARCH_DEBOUNCE_MS = 300;
const RADIO_ROW = "flex min-h-[44px] cursor-pointer items-center gap-3 px-3 py-1 text-sm text-ops-ink hover:bg-ops-canvas focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-ops-ink";
const ADD_BTN = "inline-flex min-h-[44px] max-w-full items-center gap-1 rounded text-left text-sm font-bold text-ops-ink underline hover:text-ops-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink";

interface CustomerProps {
  value: string;
  error?: string;
  /** A new client may come with its first location: both are selected. */
  onChange: (customerId: string, locationId?: string) => void;
  /** sessionStorage prefix of the job draft; the inline client dialog keeps its own draft under it. */
  draftKey?: string;
}

/** Searchable customer list (radio group, so arrow keys work): type to filter, pick one, or create the client right here (4e742976). */
export function CustomerPicker({ value, error, onChange, draftKey }: CustomerProps) {
  const { t } = useTranslation();
  const { tr } = useTr();
  const { orgId, can } = useOrg();
  const [text, setText] = useSessionState(draftKey && `${draftKey}:customerQuery`, "");
  const [q, setQ] = useState(() => text.trim());
  const [picked, setPicked] = useState<Pick<Customer, "id" | "name"> | null>(null);
  // Open state is kept too: after a reload the dialog comes back with what was typed in it.
  const [creating, setCreating] = useSessionState<string | null>(draftKey && `${draftKey}:clientOpen`, null);
  const [announce, setAnnounce] = useState("");
  const changeRef = useRef<HTMLButtonElement>(null);
  const focusChange = useRef(false);
  const clientDraft = draftKey && `${draftKey}:client`;
  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text]);
  useEffect(() => {
    if (value && focusChange.current) { focusChange.current = false; changeRef.current?.focus(); }
  }, [value]);

  const list = useQuery({
    queryKey: [...ck.customersAll(orgId), "picker", q],
    queryFn: ({ signal }) => listCustomers(orgId, q, signal),
    enabled: !value,
    staleTime: 15_000,
  });
  // The chosen client's name after a reload (the draft keeps only the id).
  const detail = useQuery({ queryKey: ck.customer(orgId, value), queryFn: () => getCustomer(orgId, value), enabled: !!value && !picked });
  const canCreate = can("customer.manage");

  const select = (c: Pick<Customer, "id" | "name">, locationId?: string, message?: string) => {
    setPicked(c);
    focusChange.current = true;
    if (message) setAnnounce(message);
    onChange(c.id, locationId);
  };
  const openCreate = () => {
    const typed = text.trim();
    // A different name typed since the last unfinished draft starts a fresh one; the same (or no) text restores it.
    if (clientDraft) {
      try {
        const stored = JSON.parse(window.sessionStorage.getItem(`${clientDraft}:form`) ?? "null") as { name?: string } | null;
        if (stored && typed && stored.name?.trim() !== typed) clearSessionDrafts(clientDraft);
      } catch { /* unreadable draft: the dialog starts empty */ }
    }
    setCreating(typed);
  };

  const live = <p aria-live="polite" className="sr-only">{announce}</p>;
  const dialog = creating !== null ? (
    <ClientDialog
      orgId={orgId}
      initialName={creating}
      withLocation
      draftKey={clientDraft || undefined}
      onClose={() => setCreating(null)}
      onSaved={(c, location) => select(c, location?.id, location
        ? tr("b2b.newJob.clientCreatedWithLocation", "{name} was created with its location and selected.", { name: c.name })
        : tr("b2b.newJob.clientCreated", "{name} was created and selected.", { name: c.name }))}
      onUseExisting={(c) => select(c, undefined, tr("b2b.newJob.clientSelected", "{name} selected.", { name: c.name }))}
    />
  ) : null;

  if (value) {
    const name = picked?.id === value ? picked.name : detail.data?.name;
    return (
      <FormGroup name="customerId" legend={t("b2b.newJob.customer", "Customer")} required error={error}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 break-words text-sm font-bold text-ops-ink">{name ?? t("b2b.newJob.customerSelected", "Customer selected")}</p>
          <button ref={changeRef} type="button" onClick={() => { setPicked(null); setAnnounce(""); onChange(""); }} className="min-h-[44px] rounded border border-ops-border-strong px-3 text-sm font-bold text-ops-ink hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink">
            {t("b2b.newJob.change", "Change")}
          </button>
        </div>
        {live}
      </FormGroup>
    );
  }
  const items = list.data ?? [];
  const typed = text.trim();
  return (
    <FormGroup name="customerId" legend={t("b2b.newJob.customer", "Customer")} required error={error}>
      <label htmlFor="nj-customer-q" className="sr-only">{t("b2b.newJob.searchCustomers", "Search customers")}</label>
      <input id="nj-customer-q" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("b2b.newJob.searchCustomers", "Search customers")} className={inputCls} autoComplete="off" />
      <div aria-live="polite" className="text-xs text-ops-ink-muted">
        {list.isFetching ? t("b2b.newJob.searching", "Searching…") : list.isError ? t("b2b.newJob.customersError", "Customers could not be loaded.") : `${items.length} ${t("b2b.newJob.customersFound", "customers found")}`}
      </div>
      {items.length > 0 ? (
        <div role="radiogroup" aria-label={t("b2b.newJob.customer", "Customer")} className="max-h-56 divide-y divide-ops-border overflow-y-auto rounded border border-ops-border-strong">
          {items.map((c) => (
            <label key={c.id} className={RADIO_ROW}>
              <input type="radio" name="nj-customer" className="h-5 w-5" checked={false} onChange={() => select(c)} />
              <span className="min-w-0"><span className="block truncate font-bold">{c.name}</span>{c.email || c.phone ? <span className="block truncate text-xs text-ops-ink-muted">{[c.email, c.phone].filter(Boolean).join(" · ")}</span> : null}</span>
            </label>
          ))}
        </div>
      ) : null}
      {canCreate ? (
        <button type="button" onClick={openCreate} className={ADD_BTN}>
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{typed ? tr("b2b.newJob.createClientNamed", "Create new client “{name}”", { name: typed }) : tr("b2b.newJob.createClient", "Create a new client")}</span>
        </button>
      ) : null}
      {live}
      {dialog}
    </FormGroup>
  );
}

interface LocationProps {
  customerId: string;
  value: string;
  error?: string;
  onChange: (locationId: string) => void;
  draftKey?: string;
}

/** Locations of the chosen customer; a single location is picked automatically. A missing one is added right here (afcfd60a, e6c69ccf). */
export function LocationPicker({ customerId, value, error, onChange, draftKey }: LocationProps) {
  const { t } = useTranslation();
  const { tr } = useTr();
  const { orgId, can } = useOrg();
  const detail = useQuery({ queryKey: ck.customer(orgId, customerId), queryFn: () => getCustomer(orgId, customerId), enabled: !!customerId });
  const locations = useMemo(() => detail.data?.locations ?? [], [detail.data]);
  const [adding, setAdding] = useSessionState<string | null>(draftKey && `${draftKey}:locationOpen`, null);
  const [announce, setAnnounce] = useState("");
  const canAdd = can("customer.manage");

  useEffect(() => {
    if (!value && locations.length === 1) onChange(locations[0].id);
  }, [locations, value, onChange]);

  if (!customerId) {
    return (
      <FormGroup name="locationId" legend={t("b2b.newJob.location", "Location")} required error={error} hint={t("b2b.newJob.pickCustomerFirst", "Choose a customer to see their locations.")}>
        <span />
      </FormGroup>
    );
  }
  const dialogOpen = adding === customerId;
  return (
    <FormGroup name="locationId" legend={t("b2b.newJob.location", "Location")} required error={error}>
      {detail.isPending ? <p role="status" className="text-sm text-ops-ink-muted">{t("b2b.newJob.loadingLocations", "Loading locations…")}</p>
        : detail.isError ? (
          <p role="alert" className="text-sm text-sig-vermilion-ink">
            {t("b2b.newJob.locationsError", "Locations could not be loaded.")}{" "}
            <button type="button" className="min-h-[44px] font-bold underline" onClick={() => void detail.refetch()}>{t("b2b.common.retry", "Retry")}</button>
          </p>
        ) : locations.length === 0 ? (
          <p className="text-sm text-ops-ink-muted">
            {canAdd ? tr("b2b.newJob.noLocationsAdd", "This customer has no locations yet. Add one here; what you typed in the job stays.")
              : tr("b2b.newJob.noLocationsAsk", "This customer has no locations yet. Ask someone who can edit clients to add one, then choose it here.")}
          </p>
        ) : (
          <div role="radiogroup" aria-label={t("b2b.newJob.location", "Location")} aria-describedby={describedBy("locationId", { error })} className="divide-y divide-ops-border rounded border border-ops-border-strong">
            {locations.map((l) => (
              <label key={l.id} className={RADIO_ROW}>
                <input type="radio" name="nj-location" className="h-5 w-5" checked={value === l.id} onChange={() => onChange(l.id)} />
                <span className="min-w-0"><span className="block truncate font-bold">{l.label}</span><span className="block truncate text-xs text-ops-ink-muted">{[l.addressLine, l.city].filter(Boolean).join(", ")}</span></span>
              </label>
            ))}
          </div>
        )}
      {/* Same element in both states, so focus returns to it after the dialog closes. */}
      {canAdd && detail.isSuccess ? (
        <button type="button" onClick={() => setAdding(customerId)} className={ADD_BTN}>
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />{locations.length === 0 ? tr("b2b.newJob.addLocation", "Add a location") : tr("b2b.newJob.addAnotherLocation", "Add another location")}
        </button>
      ) : null}
      <p aria-live="polite" className="sr-only">{announce}</p>
      {dialogOpen ? (
        <LocationDialog
          orgId={orgId}
          customerId={customerId}
          draftKey={draftKey ? `${draftKey}:location:${customerId}` : undefined}
          onClose={() => setAdding(null)}
          onSaved={(l) => { onChange(l.id); setAnnounce(tr("b2b.newJob.locationAdded", "{name} was added and selected.", { name: l.label })); }}
        />
      ) : null}
    </FormGroup>
  );
}

export { fieldId };
