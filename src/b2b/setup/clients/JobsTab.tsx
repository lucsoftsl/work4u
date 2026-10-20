"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTr } from "@/b2b/setup/i18n";
import { listClientJobs, sk } from "@/b2b/setup/api";
import type { JobStatus } from "@/b2b/api/types";
import { JOB_STATUS_META } from "@/b2b/lib/status";
import { JobsPager } from "@/b2b/components/jobs/JobsPager";
import { JobRef, StatusPill } from "@/b2b/components/StatusPill";
import { ErrorAlert, ListSkeleton, inputCls } from "@/b2b/components/catalog/ui";
import { pageOffset } from "@/b2b/lib/paging";
import { shortDate } from "./parts";
import { jobStatusLabel } from "@/b2b/lib/status-label";

const PAGE = 20;

export function JobsTab({ orgId, clientId, partialScope }: { orgId: string; clientId: string; partialScope: boolean }) {
  const { tr } = useTr();
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const params = { status: status || undefined, from: from || undefined, to: to || undefined, limit: PAGE, offset: pageOffset(page, PAGE) };
  const q = useQuery({ queryKey: sk.clientJobs(orgId, clientId, params), queryFn: ({ signal }) => listClientJobs(orgId, clientId, params, signal), placeholderData: keepPreviousData, retry: false });
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const base = `/ops/${encodeURIComponent(orgId)}/jobs`;
  const filtered = !!(status || from || to);

  return (
    <section aria-labelledby="jobs-h" className="space-y-3">
      <h2 id="jobs-h" className="text-lg font-bold text-ops-ink">{tr("b2b.clients.tab.jobs", "Job history")}</h2>
      {partialScope && <p className="text-sm text-ops-ink-muted">{tr("b2b.clients.jobs.partial", "Some jobs may not be shown. You only see jobs in your own scope.")}</p>}
      <div className="flex flex-wrap gap-2">
        <div><label htmlFor="cj-status" className="sr-only">{tr("b2b.clients.jobs.status", "Status")}</label>
          <select id="cj-status" value={status} onChange={(e) => reset(setStatus)(e.target.value)} className={`${inputCls} sm:w-auto`}>
            <option value="">{tr("b2b.clients.jobs.anyStatus", "Any status")}</option>
            {(Object.keys(JOB_STATUS_META) as JobStatus[]).map((s) => <option key={s} value={s}>{jobStatusLabel(tr, s)}</option>)}
          </select></div>
        <div><label htmlFor="cj-from" className="mr-2 text-sm text-ops-ink">{tr("b2b.clients.jobs.from", "From")}</label><input id="cj-from" type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} className={`${inputCls} sm:w-auto`} /></div>
        <div><label htmlFor="cj-to" className="mr-2 text-sm text-ops-ink">{tr("b2b.clients.jobs.to", "To")}</label><input id="cj-to" type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} className={`${inputCls} sm:w-auto`} /></div>
      </div>
      <div aria-live="polite">
        {q.isPending ? <ListSkeleton /> : q.isError && !q.data ? <ErrorAlert message={tr("b2b.clients.jobs.err", "We couldn't load the job history.")} onRetry={() => void q.refetch()} retryLabel={tr("b2b.common.retry", "Retry")} />
          : q.data && q.data.items.length === 0 ? <p className="text-sm text-ops-ink-muted">{filtered ? tr("b2b.clients.jobs.noMatch", "No jobs match these filters.") : tr("b2b.customers.noJobs", "No jobs for this customer yet.")}</p>
          : q.data && (
            <div className="relative overflow-x-auto rounded-lg border border-ops-border bg-ops-surface">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">{tr("b2b.clients.tab.jobs", "Job history")}</caption>
                <thead className="border-b border-ops-border"><tr>
                  {[tr("b2b.clients.jobs.ref", "Job"), tr("b2b.clients.jobs.title", "Title"), tr("b2b.clients.jobs.statusCol", "Status"), tr("b2b.clients.jobs.scheduled", "Scheduled"), tr("b2b.clients.jobs.address", "Address")].map((h) => <th key={h} scope="col" className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-ops-ink-muted">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-ops-border">
                  {q.data.items.map((j) => (
                    <tr key={j.id} className="align-top">
                      <td className="px-3 py-2"><Link href={`${base}/${encodeURIComponent(j.id)}`} className="inline-flex min-h-[44px] items-center focus-visible:outline focus-visible:outline-2"><JobRef reference={j.reference} /></Link></td>
                      <td className="px-3 py-2 font-bold text-ops-ink">{j.title}</td>
                      <td className="px-3 py-2"><StatusPill status={j.status as JobStatus} /></td>
                      <td className="px-3 py-2 text-ops-ink">{shortDate(j.scheduledStart) || "-"}</td>
                      <td className="px-3 py-2 text-ops-ink-muted">{j.location?.label ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
      {q.data && (q.data.total > PAGE || page > 1) && <JobsPager page={page} pageSize={PAGE} count={q.data.items.length} total={q.data.total} hasNext={q.data.hasMore} onPage={setPage} />}
    </section>
  );
}
