"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { ck, deleteCustomer, deleteLocation, getCustomer, listCustomerJobs } from "@/b2b/api/catalog";
import type { CustomerLocation } from "@/b2b/api/catalog-types";
import { isB2bError } from "@/b2b/api/client";
import { useOrg } from "@/b2b/context/OrgContext";
import { catalogActions, catalogErrorMessage } from "@/b2b/lib/catalog";
import { EmptyState } from "@/b2b/components/EmptyState";
import { JobRef, StatusPill } from "@/b2b/components/StatusPill";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, ListSkeleton, btnDanger, btnSecondary } from "@/b2b/components/catalog/ui";
import { CustomerDialog } from "./CustomerDialog";
import { LocationDialog } from "./LocationDialog";

type Dialog = { kind: "edit" } | { kind: "delete" } | { kind: "loc"; location?: CustomerLocation } | { kind: "delLoc"; location: CustomerLocation } | null;

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const org = useOrg();
  const router = useRouter();
  const qc = useQueryClient();
  const actions = catalogActions(org.can);
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);
  const back = `/ops/${encodeURIComponent(org.orgId)}/customers`;

  const q = useQuery({ queryKey: ck.customer(org.orgId, customerId), queryFn: () => getCustomer(org.orgId, customerId) });
  const jobs = useQuery({
    queryKey: ck.customerJobs(org.orgId, customerId), queryFn: () => listCustomerJobs(org.orgId, customerId),
    enabled: org.can("job.view"), retry: false,
  });
  const del = useMutation({
    mutationFn: () => deleteCustomer(org.orgId, customerId),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ck.customersAll(org.orgId) }); router.push(back); },
  });
  const delLoc = useMutation({
    mutationFn: (id: string) => deleteLocation(org.orgId, customerId, id),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ck.customer(org.orgId, customerId) }); close(); },
  });

  const backLink = (
    <Link href={back} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-ops-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("b2b.customers.title", "Customers")}
    </Link>
  );

  if (q.isPending) return <div className="mx-auto max-w-4xl space-y-3 p-4 lg:p-6">{backLink}<ListSkeleton /></div>;
  if (q.isError) {
    const gone = isB2bError(q.error) && q.error.isNotFound;
    return (
      <div className="mx-auto max-w-4xl space-y-3 p-4 lg:p-6">
        {backLink}
        {gone ? <EmptyState title={t("b2b.customers.notFound", "Customer not found")} body={t("b2b.customers.notFoundBody", "It may have been deleted, or you don't have access to it.")} /> : <ErrorAlert message={catalogErrorMessage(q.error, "customer")} onRetry={() => void q.refetch()} />}
      </div>
    );
  }
  const c = q.data;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 lg:p-6">
      {backLink}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ops-ink">{c.name}</h1>
          <p className="text-sm text-ops-ink-muted">{c.type === "PERSON" ? t("b2b.customers.person", "Person") : t("b2b.customers.company", "Company")}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ops-ink">
            {c.email && <a href={`mailto:${c.email}`} className="inline-flex min-h-[44px] items-center gap-1 underline"><Mail className="h-4 w-4" aria-hidden="true" />{c.email}</a>}
            {c.phone && <a href={`tel:${c.phone}`} className="inline-flex min-h-[44px] items-center gap-1 underline"><Phone className="h-4 w-4" aria-hidden="true" />{c.phone}</a>}
          </div>
          {c.billingAddress && <p className="mt-1 whitespace-pre-line text-sm text-ops-ink-muted">{c.billingAddress}</p>}
          {c.notes && <p className="mt-2 whitespace-pre-line rounded bg-ops-canvas p-2 text-sm text-ops-ink">{c.notes}</p>}
        </div>
        {actions.editCustomer && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setDialog({ kind: "edit" })} className={btnSecondary}><Pencil className="h-4 w-4" aria-hidden="true" />{t("b2b.common.edit", "Edit")}</button>
            {actions.deleteCustomer && <button type="button" onClick={() => setDialog({ kind: "delete" })} className={btnSecondary}><Trash2 className="h-4 w-4" aria-hidden="true" />{t("b2b.common.delete", "Delete")}</button>}
          </div>
        )}
      </header>

      <section aria-labelledby="locs-h" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="locs-h" className="text-lg font-bold text-ops-ink">{t("b2b.locations.title", "Locations")}</h2>
          {actions.editLocations && <button type="button" onClick={() => setDialog({ kind: "loc" })} className={btnSecondary}><Plus className="h-4 w-4" aria-hidden="true" />{t("b2b.locations.add", "Add location")}</button>}
        </div>
        {c.locations.length === 0 ? (
          <EmptyState icon={MapPin} title={t("b2b.locations.empty", "No locations yet")} body={actions.editLocations ? t("b2b.locations.emptyManager", "Add the address where work happens. Jobs need a location.") : t("b2b.locations.emptyViewer", "This customer has no locations. Ask a manager with customer access to add one.")} />
        ) : (
          <ul className="space-y-3">
            {c.locations.map((l) => (
              <li key={l.id} className="rounded-lg border border-ops-border bg-ops-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-ops-ink">{l.label}</h3>
                    <p className="text-sm text-ops-ink-muted">{[l.addressLine, l.postalCode, l.city, l.country].filter(Boolean).join(", ")}</p>
                  </div>
                  {actions.editLocations && (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setDialog({ kind: "loc", location: l })} className={btnSecondary}><Pencil className="h-4 w-4" aria-hidden="true" />{t("b2b.common.edit", "Edit")}<span className="sr-only"> {l.label}</span></button>
                      <button type="button" onClick={() => setDialog({ kind: "delLoc", location: l })} className={btnSecondary}><Trash2 className="h-4 w-4" aria-hidden="true" />{t("b2b.common.delete", "Delete")}<span className="sr-only"> {l.label}</span></button>
                    </div>
                  )}
                </div>
                {(l.accessInstructions || l.safetyInstructions) && (
                  <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    {l.accessInstructions && <div><dt className="font-bold text-ops-ink">{t("b2b.locations.access", "Access instructions")}</dt><dd className="whitespace-pre-line text-ops-ink-muted">{l.accessInstructions}</dd></div>}
                    {l.safetyInstructions && <div><dt className="font-bold text-sig-vermilion-ink">{t("b2b.locations.safety", "Safety instructions")}</dt><dd className="whitespace-pre-line text-ops-ink-muted">{l.safetyInstructions}</dd></div>}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {org.can("job.view") && jobs.data && (
        <section aria-labelledby="cj-h" className="space-y-3">
          <h2 id="cj-h" className="text-lg font-bold text-ops-ink">{t("b2b.customers.jobs", "Jobs")}</h2>
          {jobs.data.items.length === 0 ? <p className="text-sm text-ops-ink-muted">{t("b2b.customers.noJobs", "No jobs for this customer yet.")}</p> : (
            <ul className="divide-y divide-ops-border rounded-lg border border-ops-border bg-ops-surface">
              {jobs.data.items.map((j) => (
                <li key={j.id}>
                  <Link href={`/ops/${encodeURIComponent(org.orgId)}/jobs/${encodeURIComponent(j.id)}`} className="flex min-h-[44px] flex-wrap items-center gap-3 px-3 py-2 hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2">
                    <JobRef reference={j.reference} />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-ops-ink">{j.title}</span>
                    <StatusPill status={j.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {dialog?.kind === "edit" && <CustomerDialog orgId={org.orgId} customer={c} onClose={close} />}
      {dialog?.kind === "loc" && <LocationDialog orgId={org.orgId} customerId={c.id} location={dialog.location} onClose={close} />}
      {dialog?.kind === "delete" && (
        <Modal open title={`Delete ${c.name}?`} onClose={close}>
          <p className="mb-4 text-sm text-ops-ink">{t("b2b.customers.deleteBody", "This permanently removes the customer and its locations. Customers with jobs can't be deleted.")}</p>
          {del.isError && <div className="mb-4"><ErrorAlert message={catalogErrorMessage(del.error, "customer")} /></div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={btnSecondary}>{t("b2b.common.cancel", "Cancel")}</button>
            <button type="button" disabled={del.isPending} onClick={() => del.mutate()} className={btnDanger}>{t("b2b.common.delete", "Delete")}</button>
          </div>
        </Modal>
      )}
      {dialog?.kind === "delLoc" && (
        <Modal open title={`Delete ${dialog.location.label}?`} onClose={close}>
          <p className="mb-4 text-sm text-ops-ink">{t("b2b.locations.deleteBody", "This removes the location. Locations with jobs can't be deleted.")}</p>
          {delLoc.isError && <div className="mb-4"><ErrorAlert message={catalogErrorMessage(delLoc.error, "location")} /></div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={btnSecondary}>{t("b2b.common.cancel", "Cancel")}</button>
            <button type="button" disabled={delLoc.isPending} onClick={() => delLoc.mutate(dialog.location.id)} className={btnDanger}>{t("b2b.common.delete", "Delete")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
