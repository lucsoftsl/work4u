"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useTr } from "@/b2b/setup/i18n";
import { getClientPage, sk, type DuplicateGroup } from "@/b2b/setup/api";
import { useOnlineStatus } from "@/b2b/setup/useOnlineStatus";
import { ErrorAlert, btnPrimary, btnSecondary } from "@/b2b/components/catalog/ui";
import { MAX_MERGE_SOURCES, canMergeGroup, maskPhone, sourceIdsFor } from "./merge";
import { shortDate } from "./parts";
import { useMerge } from "./useMerge";

interface Props { orgId: string; group: DuplicateGroup; listHref: string; onMerged: (targetId: string) => void }

export function MergeReview({ orgId, group, listHref, onMerged }: Props) {
  const { tr } = useTr();
  const online = useOnlineStatus();
  const [keepId, setKeepId] = useState(group.customers[0].id);
  const { mutation, errorMessage } = useMerge(orgId, onMerged);
  // Compare cards need billing address and added date, which the duplicates list does not carry.
  const details = useQueries({ queries: group.customers.map((c) => ({ queryKey: sk.client(orgId, c.id), queryFn: () => getClientPage(orgId, c.id), staleTime: 30_000, retry: false })) });
  const keep = group.customers.find((c) => c.id === keepId) ?? group.customers[0];
  const others = group.customers.filter((c) => c.id !== keep.id);
  const sources = sourceIdsFor(group, keep.id);
  const tooMany = sources.length > MAX_MERGE_SOURCES;
  const dash = "-";

  const cards = group.customers.map((c, i) => {
    const d = details[i]?.data;
    const isKeep = c.id === keep.id;
    const rows: Array<[string, string]> = [
      [tr("b2b.customers.email", "Email"), c.email ?? dash],
      [tr("b2b.customers.phone", "Phone"), maskPhone(c.phone) ?? dash],
      [tr("b2b.customers.billing", "Billing address"), d ? d.billingAddress ?? dash : "…"],
      [tr("b2b.clients.col.added", "Added"), d ? shortDate(d.createdAt) || dash : "…"],
    ];
    return (
      <li key={c.id} className={`rounded-lg border-2 bg-ops-surface p-4 ${isKeep ? "border-ops-ink" : "border-ops-border"}`}>
        <p className={`mb-2 inline-block rounded px-2 py-0.5 text-xs font-bold ${isKeep ? "bg-ops-ink text-white" : "border border-dashed border-ops-border-strong text-ops-ink"}`}>
          {isKeep ? tr("b2b.clients.merge.keep", "Keep this one") : tr("b2b.clients.merge.willMerge", "Will be merged and archived")}
        </p>
        <h2 className="break-words text-lg font-bold text-ops-ink">{c.name}</h2>
        <dl className="mt-2 divide-y divide-ops-border text-sm">
          {rows.map(([k, v]) => <div key={k} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2 py-1.5"><dt className="text-ops-ink-muted">{k}</dt><dd className="break-words font-bold text-ops-ink">{v}</dd></div>)}
        </dl>
        <label className="mt-3 flex min-h-[44px] cursor-pointer items-center gap-3 text-sm font-bold text-ops-ink">
          <input type="radio" name="keep" className="h-5 w-5" checked={isKeep} onChange={() => setKeepId(c.id)} />
          {isKeep ? tr("b2b.clients.merge.keep", "Keep this one") : tr("b2b.clients.merge.keepInstead", "Keep this one instead")}
          <span className="sr-only"> {c.name}</span>
        </label>
      </li>
    );
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 lg:p-6">
      <Link href={listHref} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-ops-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />{tr("b2b.clients.dup.title", "Possible duplicates")}
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-ops-ink">{tr("b2b.clients.merge.title", "Merge clients")}</h1>
        <p className="text-ops-ink-muted">{tr("b2b.clients.merge.lead", "Choose the client to keep. Everything from the others moves to it.")}</p>
      </header>
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="sr-only">{tr("b2b.clients.merge.choose", "Choose the client to keep")}</legend>
        <ul className="grid gap-4 md:grid-cols-2">{cards}</ul>
      </fieldset>
      <section aria-labelledby="what-h" className="rounded-lg border border-ops-border bg-ops-surface p-4">
        <h2 id="what-h" className="text-lg font-bold text-ops-ink">{tr("b2b.clients.merge.whatTitle", "What will happen")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ops-ink">
          <li>{tr("b2b.clients.merge.moves", "Their jobs, addresses, contacts, notes and tags move to {name}.", { name: keep.name })}</li>
          <li>{tr("b2b.clients.merge.fills", "Empty email, phone and billing address on {name} are filled from the other clients. Details that are already set are not changed.", { name: keep.name })}</li>
          <li>{tr("b2b.clients.merge.archives", "Archived, not deleted: {archived}.", { archived: others.map((o) => o.name).join(", ") })}</li>
          <li>{tr("b2b.clients.merge.canUndo", "You can undo this merge right after it is done.")}</li>
        </ul>
      </section>
      {tooMany && <p role="alert" className="text-sm font-bold text-sig-vermilion-ink">{tr("b2b.clients.merge.tooMany", "You can merge up to {n} clients at once.", { n: MAX_MERGE_SOURCES })}</p>}
      {errorMessage && <ErrorAlert message={errorMessage} />}
      {!online && <p role="status" className="text-sm font-bold text-ops-ink">{tr("b2b.clients.offline", "You're offline. Reconnect to save changes.")}</p>}
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-ops-border bg-ops-canvas py-3">
        <Link href={listHref} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</Link>
        <button type="button" disabled={!online || mutation.isPending || !canMergeGroup(group, keep.id)} className={btnPrimary}
          onClick={() => mutation.mutate({ targetId: keep.id, sourceIds: sources, targetName: keep.name })}>
          {mutation.isPending ? tr("b2b.clients.merge.merging", "Merging…") : tr("b2b.clients.merge.action", "Merge {n} clients", { n: group.customers.length })}
        </button>
      </div>
    </div>
  );
}
