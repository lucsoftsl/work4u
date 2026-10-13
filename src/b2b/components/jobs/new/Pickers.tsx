"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { ck, getCustomer, listCustomers } from "@/b2b/api/catalog";
import type { Customer } from "@/b2b/api/catalog-types";
import { useOrg } from "@/b2b/context/OrgContext";
import { inputCls } from "@/b2b/components/catalog/ui";
import { describedBy, fieldId, FormGroup } from "./FormField";

const SEARCH_DEBOUNCE_MS = 300;
const RADIO_ROW = "flex min-h-[44px] cursor-pointer items-center gap-3 px-3 py-1 text-sm text-ops-ink hover:bg-ops-canvas focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-ops-ink";

interface CustomerProps { value: string; error?: string; onChange: (customerId: string) => void }

/** Searchable customer list (radio group, so arrow keys work): type to filter, pick one. */
export function CustomerPicker({ value, error, onChange }: CustomerProps) {
  const { t } = useTranslation();
  const { orgId, can } = useOrg();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Customer | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text]);

  const list = useQuery({
    queryKey: [...ck.customersAll(orgId), "picker", q],
    queryFn: ({ signal }) => listCustomers(orgId, q, signal),
    enabled: !value,
    staleTime: 15_000,
  });

  const create = can("customer.manage") ? (
    <Link href={`/ops/${encodeURIComponent(orgId)}/customers`} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-ops-ink underline">
      <Plus className="h-4 w-4" aria-hidden="true" />{t("b2b.newJob.createCustomer", "Create a new customer")}
    </Link>
  ) : null;

  if (value) {
    return (
      <FormGroup name="customerId" legend={t("b2b.newJob.customer", "Customer")} required error={error}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-bold text-ops-ink">{picked?.name ?? t("b2b.newJob.customerSelected", "Customer selected")}</p>
          <button type="button" onClick={() => { setPicked(null); onChange(""); }} className="min-h-[44px] rounded border border-ops-border-strong px-3 text-sm font-bold text-ops-ink hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink">
            {t("b2b.newJob.change", "Change")}
          </button>
        </div>
      </FormGroup>
    );
  }
  const items = list.data ?? [];
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
              <input type="radio" name="nj-customer" className="h-5 w-5" checked={false} onChange={() => { setPicked(c); onChange(c.id); }} />
              <span className="min-w-0"><span className="block truncate font-bold">{c.name}</span>{c.email || c.phone ? <span className="block truncate text-xs text-ops-ink-muted">{[c.email, c.phone].filter(Boolean).join(" · ")}</span> : null}</span>
            </label>
          ))}
        </div>
      ) : null}
      {create}
    </FormGroup>
  );
}

interface LocationProps { customerId: string; value: string; error?: string; onChange: (locationId: string) => void }

/** Locations of the chosen customer; a single location is picked automatically. */
export function LocationPicker({ customerId, value, error, onChange }: LocationProps) {
  const { t } = useTranslation();
  const { orgId } = useOrg();
  const detail = useQuery({ queryKey: ck.customer(orgId, customerId), queryFn: () => getCustomer(orgId, customerId), enabled: !!customerId });
  const locations = useMemo(() => detail.data?.locations ?? [], [detail.data]);

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
  return (
    <FormGroup name="locationId" legend={t("b2b.newJob.location", "Location")} required error={error}>
      {detail.isPending ? <p role="status" className="text-sm text-ops-ink-muted">{t("b2b.newJob.loadingLocations", "Loading locations…")}</p>
        : detail.isError ? (
          <p role="alert" className="text-sm text-sig-vermilion-ink">
            {t("b2b.newJob.locationsError", "Locations could not be loaded.")}{" "}
            <button type="button" className="font-bold underline" onClick={() => void detail.refetch()}>{t("b2b.common.retry", "Retry")}</button>
          </p>
        ) : locations.length === 0 ? (
          <p className="text-sm text-ops-ink-muted">
            {t("b2b.newJob.noLocations", "This customer has no locations yet.")}{" "}
            <Link href={`/ops/${encodeURIComponent(orgId)}/customers/${encodeURIComponent(customerId)}`} className="font-bold text-ops-ink underline">{t("b2b.newJob.addLocation", "Add a location")}</Link>
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
    </FormGroup>
  );
}

export { fieldId };
