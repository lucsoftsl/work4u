"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useTr } from "@/b2b/setup/i18n";
import type { ClientLocation } from "@/b2b/setup/api";
import { deleteLocation } from "@/b2b/api/catalog";
import { catalogErrorMessage } from "@/b2b/lib/catalog";
import { EmptyState } from "@/b2b/components/EmptyState";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, btnDanger, btnSecondary } from "@/b2b/components/catalog/ui";
import { LocationDialog } from "@/b2b/components/customers/LocationDialog";
import { formatAddress, mapsUrl } from "./address";

type Dlg = { kind: "form"; location?: ClientLocation } | { kind: "delete"; location: ClientLocation } | null;

export function AddressesTab({ orgId, clientId, locations, canManage, offline }: { orgId: string; clientId: string; locations: ClientLocation[]; canManage: boolean; offline: boolean }) {
  const { tr } = useTr();
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<Dlg>(null);
  const del = useMutation({
    mutationFn: (id: string) => deleteLocation(orgId, clientId, id),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["org", orgId, "customer", clientId] }); setDlg(null); },
  });
  return (
    <section aria-labelledby="addr-h" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="addr-h" className="text-lg font-bold text-ops-ink">{tr("b2b.locations.title", "Locations")}</h2>
        {canManage && <button type="button" disabled={offline} onClick={() => setDlg({ kind: "form" })} className={btnSecondary}><Plus className="h-4 w-4" aria-hidden="true" />{tr("b2b.locations.add", "Add location")}</button>}
      </div>
      {locations.length === 0 ? (
        <EmptyState icon={MapPin} title={tr("b2b.locations.empty", "No locations yet")} body={canManage ? tr("b2b.locations.emptyManager", "Add the address where work happens. Jobs need a location.") : tr("b2b.locations.emptyViewer", "This customer has no locations. Ask a manager with customer access to add one.")} />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {locations.map((l) => (
            <li key={l.id} className="rounded-lg border border-ops-border bg-ops-surface p-4">
              <h3 className="font-bold text-ops-ink">{l.label}</h3>
              <p className="text-sm text-ops-ink-muted">{formatAddress(l)}</p>
              {l.accessInstructions && <p className="mt-2 whitespace-pre-line text-sm text-ops-ink"><span className="font-bold">{tr("b2b.clients.access", "Access:")}</span> {l.accessInstructions}</p>}
              {l.safetyInstructions && (
                <p className="mt-2 whitespace-pre-line rounded border border-sig-orange-ink bg-sig-orange-tint p-2 text-sm text-sig-orange-ink"><span className="font-bold">{tr("b2b.clients.safety", "Safety:")}</span> {l.safetyInstructions}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={mapsUrl(l)} target="_blank" rel="noopener noreferrer" className={btnSecondary}>{tr("b2b.clients.openMaps", "Open in maps")}<span className="sr-only"> {l.label}</span></a>
                {canManage && (
                  <>
                    <button type="button" disabled={offline} onClick={() => setDlg({ kind: "form", location: l })} className={btnSecondary}><Pencil className="h-4 w-4" aria-hidden="true" />{tr("b2b.common.edit", "Edit")}<span className="sr-only"> {l.label}</span></button>
                    <button type="button" disabled={offline} onClick={() => setDlg({ kind: "delete", location: l })} className={btnSecondary}><Trash2 className="h-4 w-4" aria-hidden="true" />{tr("b2b.common.delete", "Delete")}<span className="sr-only"> {l.label}</span></button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {dlg?.kind === "form" && <LocationDialog orgId={orgId} customerId={clientId} location={dlg.location} onClose={() => setDlg(null)} />}
      {dlg?.kind === "delete" && (
        <Modal open title={tr("b2b.clients.location.deleteTitle", "Delete {name}?", { name: dlg.location.label })} onClose={() => setDlg(null)}>
          <p className="mb-4 text-sm text-ops-ink">{tr("b2b.locations.deleteBody", "This removes the location. Locations with jobs can't be deleted.")}</p>
          {del.isError && <div className="mb-4"><ErrorAlert message={catalogErrorMessage(del.error, "location")} /></div>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setDlg(null)} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>
            <button type="button" disabled={del.isPending || offline} onClick={() => del.mutate(dlg.location.id)} className={btnDanger}>{tr("b2b.common.delete", "Delete")}</button>
          </div>
        </Modal>
      )}
    </section>
  );
}
