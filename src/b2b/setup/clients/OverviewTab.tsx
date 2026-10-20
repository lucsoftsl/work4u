"use client";

import { noteAuthorLabel } from "./noteRules";
import { useTr } from "@/b2b/setup/i18n";
import type { ClientPage } from "@/b2b/setup/api";
import { ContactsCard } from "./ContactsCard";
import { TagChips, shortDate, typeLabel } from "./parts";

export function OverviewTab({ client, orgId, canManage, offline }: { client: ClientPage; orgId: string; canManage: boolean; offline: boolean }) {
  const { tr } = useTr();
  const stat = (label: string, value: string | number) => (
    <div className="rounded-lg border border-ops-border bg-ops-surface p-3"><dd className="font-mono text-2xl font-bold text-ops-ink">{value}</dd><dt className="text-sm text-ops-ink-muted">{label}</dt></div>
  );
  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2 py-1.5 text-sm"><dt className="text-ops-ink-muted">{label}</dt><dd className="break-words font-bold text-ops-ink">{value || "-"}</dd></div>
  );
  return (
    <div className="space-y-4">
      {client.stats && (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={tr("b2b.clients.stats", "Job statistics")}>
          {stat(tr("b2b.clients.stat.jobs", "Jobs in total"), client.stats.jobCount)}
          {stat(tr("b2b.clients.stat.open", "Open jobs"), client.stats.openJobs)}
          {stat(tr("b2b.clients.stat.completed", "Completed jobs"), client.stats.completedJobs)}
          {stat(tr("b2b.clients.stat.last", "Last job"), shortDate(client.stats.lastJobAt) || "-")}
        </dl>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <ContactsCard orgId={orgId} clientId={client.id} contacts={client.contacts} canManage={canManage} offline={offline} />
          <section aria-labelledby="pinned-h" className="rounded-lg border border-ops-border bg-ops-surface p-4">
            <h2 id="pinned-h" className="text-lg font-bold text-ops-ink">{tr("b2b.clients.pinned", "Pinned notes")}</h2>
            {client.pinnedNotes.length === 0 ? <p className="mt-2 text-sm text-ops-ink-muted">{tr("b2b.clients.pinned.empty", "No pinned notes.")}</p> : (
              <ul className="mt-2 space-y-3">
                {client.pinnedNotes.map((n) => (
                  <li key={n.id}><p className="whitespace-pre-line break-words text-ops-ink">{n.body}</p><p className="text-xs text-ops-ink-muted">{[noteAuthorLabel(n.author, tr("b2b.member.unnamed", "Team member"), tr("b2b.clients.note.formerAuthor", "Former team member")), shortDate(n.createdAt)].join(" · ")}</p></li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <section aria-labelledby="details-h" className="self-start rounded-lg border border-ops-border bg-ops-surface p-4">
          <h2 id="details-h" className="text-lg font-bold text-ops-ink">{tr("b2b.clients.details", "Details")}</h2>
          <dl className="mt-2">
            {row(tr("b2b.customers.type", "Type"), typeLabel(client.type, tr))}
            {row(tr("b2b.clients.externalId", "Client ID"), client.externalId)}
            {row(tr("b2b.customers.billing", "Billing address"), client.billingAddress && <span className="whitespace-pre-line">{client.billingAddress}</span>)}
            {row(tr("b2b.customers.email", "Email"), client.email && <a href={`mailto:${client.email}`} className="underline">{client.email}</a>)}
            {row(tr("b2b.customers.phone", "Phone"), client.phone && <a href={`tel:${client.phone}`} className="underline">{client.phone}</a>)}
            {row(tr("b2b.clients.tags", "Tags"), client.tags.length ? <TagChips tags={client.tags} /> : null)}
          </dl>
          {client.legacyNote && (
            <div className="mt-3 rounded bg-ops-canvas p-3">
              <h3 className="text-sm font-bold text-ops-ink">{tr("b2b.clients.legacyNote", "Earlier note")}</h3>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-ops-ink">{client.legacyNote}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
