"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Copy, Plus, Search, Upload, UsersRound } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { CLIENTS_PAGE_SIZE, listClients, listTags, sk, type Client } from "@/b2b/setup/api";
import { setupErrorMessage } from "@/b2b/setup/errors";
import { useTr } from "@/b2b/setup/i18n";
import { useOnlineStatus } from "@/b2b/setup/useOnlineStatus";
import { JobsPager } from "@/b2b/components/jobs/JobsPager";
import { EmptyState } from "@/b2b/components/EmptyState";
import { ErrorAlert, ListSkeleton, btnPrimary, btnSecondary } from "@/b2b/components/catalog/ui";
import { ClientDialog } from "./ClientDialog";
import { ClientsList } from "./ClientsList";
import { ClientsToolbar } from "./ClientsToolbar";
import { OfflineNote } from "./parts";
import { hasActiveFilters, listHref, parseListState, toApiParams, type ClientListState } from "./listParams";
import { useArchiveToggle } from "./useArchiveToggle";

const DEBOUNCE_MS = 300;

export function ClientsPage() {
  const { tr, trn } = useTr();
  const org = useOrg();
  const online = useOnlineStatus();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const state = parseListState(sp);
  const canManage = org.can("customer.manage");
  const [text, setText] = useState(state.q);
  const [dialog, setDialog] = useState<{ client?: Client } | null>(null);
  const archive = useArchiveToggle(org.orgId);
  const base = `/ops/${encodeURIComponent(org.orgId)}/customers`;

  const go = (patch: Partial<ClientListState>, resetPage = true) =>
    router.replace(listHref(pathname, { ...state, ...patch, ...(resetPage && !("page" in patch) ? { page: 1 } : {}) }), { scroll: false });

  useEffect(() => { setText(state.q); }, [state.q]);
  useEffect(() => {
    if (text.trim() === state.q) return;
    const id = setTimeout(() => go({ q: text.trim() }), DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const params = toApiParams(state);
  const list = useQuery({ queryKey: sk.clients(org.orgId, params), queryFn: ({ signal }) => listClients(org.orgId, params, signal), placeholderData: keepPreviousData });
  const tags = useQuery({ queryKey: sk.tags(org.orgId), queryFn: () => listTags(org.orgId), staleTime: 60_000, retry: false });
  const data = list.data;
  const total = data?.total ?? 0;
  const filtered = hasActiveFilters(state);

  const addButton = canManage && <button type="button" disabled={!online} onClick={() => setDialog({})} className={btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" />{tr("b2b.clients.add", "Add client")}</button>;
  const empty = !filtered ? (
    <EmptyState icon={UsersRound} title={tr("b2b.clients.empty.title", "Add the people and places you work for")}
      body={canManage ? tr("b2b.clients.empty.body", "Add a client by hand or import a CSV file. Jobs are created for clients and their addresses.") : tr("b2b.clients.empty.viewer", "No clients have been added yet. Ask someone who manages clients to add them.")}
      action={canManage ? <div className="flex flex-wrap justify-center gap-2">{addButton}<Link href={`${base}/import`} className={btnSecondary}>{tr("b2b.clients.import", "Import CSV")}</Link></div> : undefined} />
  ) : (
    <EmptyState icon={Search} title={tr("b2b.clients.noMatch", "No clients match")} body={tr("b2b.clients.noMatchBody", "Check the spelling or change the filters.")}
      action={<button type="button" className={btnPrimary} onClick={() => { setText(""); router.replace(pathname, { scroll: false }); }}>{tr("b2b.clients.clearFilters", "Clear filters")}</button>} />
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ops-ink">{tr("b2b.clients.title", "Clients")}</h1>
          {data && <p className="text-sm text-ops-ink-muted">{trn("b2b.clients.count", { one: "{n} client", other: "{n} clients", few: "{n} clienți" }, total)}</p>}
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Link href={`${base}/duplicates`} className={btnSecondary}><Copy className="h-4 w-4" aria-hidden="true" />{tr("b2b.clients.findDuplicates", "Find duplicates")}</Link>
            <Link href={`${base}/import`} className={btnSecondary}><Upload className="h-4 w-4" aria-hidden="true" />{tr("b2b.clients.import", "Import CSV")}</Link>
            {addButton}
          </div>
        )}
      </header>
      {!canManage && <p className="text-sm text-ops-ink-muted">{tr("b2b.clients.viewOnly", "View only. Ask someone who manages clients to add or change them.")}</p>}
      {!online && <OfflineNote />}
      <ClientsToolbar text={text} onText={setText} tag={state.tag} onTag={(tag) => go({ tag })} tags={tags.data ?? []}
        archived={state.archived} onArchived={(archived) => go({ archived })} sort={state.sort} onSort={(sort) => go({ sort })} />
      <section aria-labelledby="clients-results" aria-live="polite">
        <h2 id="clients-results" className="sr-only">{tr("b2b.clients.results", "Client list")}</h2>
        {list.isPending ? <ListSkeleton rows={5} /> : list.isError && !data ? (
          <ErrorAlert message={tr("b2b.clients.err.load", "We couldn't load your clients.")} onRetry={() => void list.refetch()} retryLabel={tr("b2b.common.retry", "Retry")} />
        ) : data && data.items.length === 0 && state.page <= 1 ? empty : data && (
          <ClientsList items={data.items} base={base} jobsNewHref={`/ops/${encodeURIComponent(org.orgId)}/jobs/new`} canManage={canManage} canCreateJob={org.can("job.create")} offline={!online}
            onEdit={(c) => setDialog({ client: c })} onToggleArchive={(c) => archive.mutate({ id: c.id, name: c.name, archive: !c.archivedAt })} />
        )}
      </section>
      {archive.isError && <p role="alert" className="text-sm font-bold text-sig-vermilion-ink">{setupErrorMessage(archive.error, tr)}</p>}
      {data && data.items.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-ops-ink-muted">{total <= CLIENTS_PAGE_SIZE && state.page <= 1 && <>{tr("b2b.clients.showing", "Showing {n} of {total}", { n: data.items.length, total })}</>}
            {state.archived === "false" && <>{total <= CLIENTS_PAGE_SIZE && state.page <= 1 ? " · " : ""}<button type="button" onClick={() => go({ archived: "true" })} className="font-bold text-ops-ink underline">{tr("b2b.clients.archived.showing", "Show archived clients")}</button></>}</p>
          {(total > CLIENTS_PAGE_SIZE || state.page > 1) && <JobsPager page={state.page} pageSize={CLIENTS_PAGE_SIZE} count={data.items.length} total={total} hasNext={data.hasMore} onPage={(page) => go({ page }, false)} />}
        </div>
      )}
      {dialog && <ClientDialog orgId={org.orgId} client={dialog.client} onClose={() => setDialog(null)} onSaved={(c) => { if (!dialog.client) router.push(`${base}/${encodeURIComponent(c.id)}`); }} />}
    </div>
  );
}
