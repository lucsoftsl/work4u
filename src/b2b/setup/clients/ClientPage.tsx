"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Pencil, Plus } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { findDuplicates, getClientPage, sk } from "@/b2b/setup/api";
import { isB2bError } from "@/b2b/api/client";
import { useTr } from "@/b2b/setup/i18n";
import { useOnlineStatus } from "@/b2b/setup/useOnlineStatus";
import { EmptyState } from "@/b2b/components/EmptyState";
import { ErrorAlert, ListSkeleton, btnPrimary, btnSecondary } from "@/b2b/components/catalog/ui";
import { AddressesTab } from "./AddressesTab";
import { ClientDialog } from "./ClientDialog";
import { ClientTabs, panelDomId, tabDomId } from "./ClientTabs";
import { JobsTab } from "./JobsTab";
import { NotesTab } from "./NotesTab";
import { OverviewTab } from "./OverviewTab";
import { OfflineNote, TagChips, typeLabel, useClientsBase } from "./parts";
import { jobScopeIsPartial } from "./address";
import { groupId } from "./merge";
import { TAB_ORDER, type ClientTabId } from "./tabs";
import { useArchiveToggle } from "./useArchiveToggle";

export function ClientPage({ clientId }: { clientId: string }) {
  const { tr } = useTr();
  const org = useOrg();
  const online = useOnlineStatus();
  const base = useClientsBase();
  const [tab, setTab] = useState<ClientTabId>("overview");
  const [editing, setEditing] = useState(false);
  const canManage = org.can("customer.manage");
  const canJobs = org.can("job.view");
  const archive = useArchiveToggle(org.orgId);
  const q = useQuery({ queryKey: sk.client(org.orgId, clientId), queryFn: () => getClientPage(org.orgId, clientId) });
  // Best effort: only people who can merge look for duplicates, and any failure is ignored.
  const dups = useQuery({ queryKey: sk.duplicates(org.orgId), queryFn: () => findDuplicates(org.orgId), enabled: canManage, retry: false, staleTime: 60_000 });
  const group = dups.data?.groups.find((g) => g.customers.some((c) => c.id === clientId));

  const back = (
    <Link href={base} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-ops-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />{tr("b2b.clients.title", "Clients")}
    </Link>
  );
  const frame = "mx-auto w-full max-w-6xl space-y-4 p-4 lg:p-6";
  if (q.isPending) return <div className={frame}>{back}<h1 className="sr-only">{tr("b2b.clients.title", "Clients")}</h1><ListSkeleton /></div>;
  if (q.isError) {
    const gone = isB2bError(q.error) && q.error.isNotFound;
    return (
      <div className={frame}>{back}
        {gone ? <EmptyState title={tr("b2b.clients.notFound", "Client not found")} body={tr("b2b.clients.notFoundBody", "It may have been removed, or you don't have access to it.")} />
          : <ErrorAlert message={tr("b2b.clients.err.loadOne", "We couldn't load this client.")} onRetry={() => void q.refetch()} retryLabel={tr("b2b.common.retry", "Retry")} />}
      </div>
    );
  }
  const c = q.data;
  const archived = !!c.archivedAt;
  const enabled = TAB_ORDER.filter((t) => t !== "files" && (t !== "jobs" || canJobs));
  const counts = { addresses: c.locations.length, jobs: c.stats?.jobCount };
  const active = enabled.includes(tab) ? tab : "overview";
  const jobHref = `/ops/${encodeURIComponent(org.orgId)}/jobs/new`;

  return (
    <div className={frame}>
      {back}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-ops-ink">{c.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ops-ink-muted"><span>{typeLabel(c.type, tr)}</span><TagChips tags={c.tags} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && <button type="button" disabled={!online} onClick={() => setEditing(true)} className={btnSecondary}><Pencil className="h-4 w-4" aria-hidden="true" />{tr("b2b.common.edit", "Edit")}</button>}
          {canManage && <button type="button" disabled={!online || archive.isPending} onClick={() => archive.mutate({ id: c.id, name: c.name, archive: !archived })} className={btnSecondary}>{archived ? tr("b2b.clients.restore", "Restore") : tr("b2b.clients.archive", "Archive")}</button>}
          {org.can("job.create") && !archived && <Link href={jobHref} className={btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" />{tr("b2b.clients.newJob", "New job")}</Link>}
        </div>
      </header>
      {archived && <p role="status" className="rounded border border-ops-border-strong bg-ops-surface p-3 text-sm font-bold text-ops-ink">{tr("b2b.clients.archivedBanner", "Archived. Restore to create jobs.")}</p>}
      {group && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded border border-sig-orange-ink bg-sig-orange-tint p-3 text-sm text-sig-orange-ink">
          <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{tr("b2b.clients.dup.banner", "This client may be a duplicate of another one.")}</span>
          <Link href={`${base}/duplicates?group=${encodeURIComponent(groupId(group))}`} className="inline-flex min-h-[44px] items-center font-bold underline">{tr("b2b.clients.dup.review", "Review and merge")}</Link>
        </div>
      )}
      {!online && <OfflineNote />}
      <ClientTabs active={active} onChange={setTab} counts={counts} enabled={enabled} />
      <div role="tabpanel" id={panelDomId(active)} aria-labelledby={tabDomId(active)} tabIndex={0} className="focus-visible:outline focus-visible:outline-2">
        {active === "overview" && <OverviewTab client={c} orgId={org.orgId} canManage={canManage} offline={!online} />}
        {active === "addresses" && <AddressesTab orgId={org.orgId} clientId={c.id} locations={c.locations} canManage={canManage} offline={!online} />}
        {active === "jobs" && <JobsTab orgId={org.orgId} clientId={c.id} partialScope={jobScopeIsPartial(org.me?.permissions)} />}
        {active === "notes" && <NotesTab orgId={org.orgId} clientId={c.id} can={org.can} offline={!online} />}
      </div>
      {editing && <ClientDialog orgId={org.orgId} client={c} onClose={() => setEditing(false)} />}
    </div>
  );
}
