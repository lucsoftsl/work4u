"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { findDuplicates, sk } from "@/b2b/setup/api";
import { useTr } from "@/b2b/setup/i18n";
import { EmptyState } from "@/b2b/components/EmptyState";
import { ErrorAlert, ListSkeleton, btnSecondary } from "@/b2b/components/catalog/ui";
import { MergeReview } from "./MergeReview";
import { findGroup, groupId, maskEmail, maskPhone } from "./merge";
import { useClientsBase } from "./parts";

export function DuplicatesPage() {
  const { tr, trn } = useTr();
  const org = useOrg();
  const router = useRouter();
  const sp = useSearchParams();
  const base = useClientsBase();
  const groupParam = sp.get("group");
  const canManage = org.can("customer.manage");
  const q = useQuery({ queryKey: sk.duplicates(org.orgId), queryFn: () => findDuplicates(org.orgId), enabled: canManage });
  const listUrl = `${base}/duplicates`;
  const reason = (r: string) => r === "EMAIL" ? tr("b2b.clients.dup.reason.email", "Same email") : r === "PHONE" ? tr("b2b.clients.dup.reason.phone", "Same phone number") : tr("b2b.clients.dup.reason.name", "Same name");

  const back = <Link href={base} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-ops-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{tr("b2b.clients.title", "Clients")}</Link>;
  const frame = "mx-auto w-full max-w-4xl space-y-4 p-4 lg:p-6";

  if (!canManage) {
    return <div className={frame}>{back}<h1 className="text-2xl font-bold text-ops-ink">{tr("b2b.clients.dup.title", "Possible duplicates")}</h1>
      <p className="text-ops-ink-muted">{tr("b2b.clients.dup.noAccess", "Only people who manage clients can review duplicates. Ask an administrator.")}</p></div>;
  }
  const selected = q.data ? findGroup(q.data.groups, groupParam) : undefined;
  if (selected) return <MergeReview key={groupId(selected)} orgId={org.orgId} group={selected} listHref={listUrl} onMerged={(id) => router.push(`${base}/${encodeURIComponent(id)}`)} />;

  const groups = q.data?.groups ?? [];
  return (
    <div className={frame}>
      {back}
      <header>
        <h1 className="text-2xl font-bold text-ops-ink">{tr("b2b.clients.dup.title", "Possible duplicates")}</h1>
        {groups.length > 0 && <p className="text-ops-ink-muted">{trn("b2b.clients.dup.lead", { one: "We found {n} group of clients that look like the same person or company. Review it before merging.", other: "We found {n} groups of clients that look like the same person or company. Review each one before merging." }, groups.length)}</p>}
      </header>
      <div aria-live="polite">
        {q.isPending ? <ListSkeleton /> : q.isError ? <ErrorAlert message={tr("b2b.clients.dup.err", "We couldn't check for duplicates.")} onRetry={() => void q.refetch()} retryLabel={tr("b2b.common.retry", "Retry")} />
          : groups.length === 0 ? <EmptyState icon={CheckCircle2} title={tr("b2b.clients.dup.none", "No duplicates found.")} />
          : (
            <ul className="space-y-3">
              {groups.map((g) => (
                <li key={groupId(g)} className="rounded-lg border border-ops-border bg-ops-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ops-ink-muted">{reason(g.reason)}: <span className="break-all font-mono text-ops-ink">{g.key}</span></p>
                      <ul className="mt-1 text-ops-ink">{g.customers.map((c) => <li key={c.id} className="break-words font-bold">{c.name}<span className="ml-2 text-sm font-normal text-ops-ink-muted">{[maskEmail(c.email), maskPhone(c.phone)].filter(Boolean).join(" · ")}</span></li>)}</ul>
                    </div>
                    <Link href={`${listUrl}?group=${encodeURIComponent(groupId(g))}`} className={btnSecondary}>{tr("b2b.clients.dup.review", "Review and merge")}<span className="sr-only"> {g.customers.map((c) => c.name).join(", ")}</span></Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}
