"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n";
import { isB2bError } from "@/b2b/api/client";
import { approveReview, sendBackReview } from "@/b2b/api/endpoints";
import { listReviewQueue, reviewQueueKey, type ReviewQueueItem, type ReviewQueuePage } from "@/b2b/api/review";
import { EmptyState } from "@/b2b/components/EmptyState";
import { Banner, btnClass, ErrorRetry, ReasonDialog, Skeleton } from "@/b2b/components/workspace/ui";
import { useOrg } from "@/b2b/context/OrgContext";
import { classifyReviewError, parseReviewPage, reviewDirHref, reviewPageHref, removeFromQueue, restoreToQueue, type Removal } from "@/b2b/lib/review";
import { JobsPager } from "@/b2b/components/jobs/JobsPager";
import { PAGE_SIZE } from "@/b2b/lib/job-filters";
import { ApproveDialog } from "./ApproveDialog";
import { ReviewRow } from "./ReviewRow";

type Queue = ReviewQueuePage;
type Target = { item: ReviewQueueItem; mode: "approve" | "sendBack" };
type Vars = { item: ReviewQueueItem; note?: string; reason?: string };
type Ctx = Removal<ReviewQueueItem>;

export function ReviewQueueView() {
  const { orgId, can, me } = useOrg();
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { dir, page, cursor } = parseReviewPage(new URLSearchParams(params.toString()));
  const paging = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, cursor };
  const key = [...reviewQueueKey(orgId, dir), paging];
  const tz = me?.org.timezone ?? "UTC";
  const [target, setTarget] = useState<Target | null>(null);
  const [error, setError] = useState<{ kind: string; message: string } | null>(null);
  const [staleMsg, setStaleMsg] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const q = useQuery({ queryKey: key, queryFn: ({ signal }) => listReviewQueue(orgId, dir, paging, signal), staleTime: 15_000, placeholderData: keepPreviousData });

  const act = useMutation<unknown, unknown, Vars, Ctx>({
    mutationFn: ({ item, note, reason }) =>
      reason !== undefined ? sendBackReview(orgId, item.id, item.version, reason) : approveReview(orgId, item.id, item.version, note),
    onMutate: async ({ item }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Queue>(key);
      const removal = removeFromQueue(prev?.items ?? [], item.id);
      if (prev) qc.setQueryData<Queue>(key, { ...prev, items: removal.next, total: Math.max(0, prev.total - (removal.removed ? 1 : 0)) });
      setTarget(null);
      return removal;
    },
    onError: (e, { item }, ctx) => {
      if (ctx) qc.setQueryData<Queue>(key, (cur) => (cur ? { ...cur, items: restoreToQueue(cur.items, ctx), total: cur.total + (ctx.removed ? 1 : 0) } : cur));
      const described = classifyReviewError(isB2bError(e) ? e : {}, t);
      if (described.kind === "stale") setStaleMsg(`${item.reference}: ${described.message}`);
      else setError({ kind: described.kind, message: `${item.reference}: ${described.message}` });
    },
    onSuccess: (_d, { item, reason }) => {
      setError(null);
      toast.push({ message: reason !== undefined ? t("b2b.job.review.sentBack", "{ref} sent back to the team").replace("{ref}", item.reference) : t("b2b.job.review.approved", "{ref} approved and closed").replace("{ref}", item.reference), tone: "success" });
    },
    onSettled: () => {
      if (!returnFocus.current?.isConnected) headingRef.current?.focus();
      void qc.invalidateQueries({ queryKey: reviewQueueKey(orgId) }); },
  });

  const refresh = () => { setStaleMsg(null); setError(null); void q.refetch(); };
  const close = () => { setTarget(null); returnFocus.current?.focus(); };
  const open = (item: ReviewQueueItem, mode: Target["mode"]) => { returnFocus.current = document.activeElement as HTMLElement | null; setError(null); setTarget({ item, mode }); };

  const items = q.data?.items ?? [];
  const total = q.data?.total ?? items.length;
  const setDir = (next: "asc" | "desc") => router.replace(reviewDirHref(pathname, next), { scroll: false });
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <header>
        <h1 ref={headingRef} tabIndex={-1} className="font-display focus:outline-none text-2xl font-bold">{t("b2b.review.title", "Review queue")}</h1>
        <p className="text-sm text-ops-ink-muted">{dir === "asc" ? t("b2b.review.subtitle", "Completed jobs waiting for sign-off, oldest first.") : t("b2b.review.subtitleNewest", "Completed jobs waiting for sign-off, newest first.")}</p>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-ops-ink-muted">{q.data ? `${t("b2b.review.waiting", "Waiting for review")}: ${total}` : ""}</p>
        <div role="group" aria-label={t("b2b.review.order", "Order")} className="flex">
          {(["asc", "desc"] as const).map((d) => (
            <button key={d} type="button" aria-pressed={dir === d} onClick={() => setDir(d)}
              className={`min-h-[44px] border border-ops-border-strong px-3 text-sm font-bold first:rounded-l last:rounded-r focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink ${dir === d ? "bg-ops-ink text-white" : "bg-ops-surface text-ops-ink hover:bg-ops-canvas"}`}>
              {d === "asc" ? t("b2b.review.oldest", "Oldest first") : t("b2b.review.newest", "Newest first")}
            </button>
          ))}
        </div>
      </div>

      {staleMsg ? (
        <Banner tone="warning" role="alert" action={<button type="button" onClick={refresh} className={btnClass("secondary")}>{t("b2b.review.refresh", "Refresh")}</button>}>{staleMsg}</Banner>
      ) : null}
      {error ? <Banner tone={error.kind === "forbidden" ? "warning" : "danger"} role="alert">{error.message}</Banner> : null}

      {q.isPending ? (
        <div role="status" aria-busy="true" className="space-y-3"><span className="sr-only">{t("b2b.common.loading", "Loading")}</span><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : q.isError ? (
        <ErrorRetry message={t("b2b.review.loadError", "Couldn't load the review queue.")} onRetry={() => void q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={t("b2b.review.emptyTitle", "No jobs waiting for review")}
          body={t("b2b.review.emptyBody", "When a team completes a job that needs sign-off, it appears here. Only members with close rights, such as admins and dispatchers, review jobs.")} />
      ) : (
        <ul className="space-y-3" aria-label={t("b2b.review.title", "Review queue")}>
          {items.map((item) => (
            <ReviewRow key={item.id} orgId={orgId} tz={tz} item={item} can={can} busy={act.isPending || q.isFetching || q.isPlaceholderData}
              onApprove={() => open(item, "approve")} onSendBack={() => open(item, "sendBack")} />
          ))}
        </ul>
      )}

      {q.data && (items.length > 0 || page > 1) ? (
        <JobsPager page={page} pageSize={PAGE_SIZE} count={items.length} total={total} hasNext={q.data.hasMore}
          disabled={q.isFetching || q.isPlaceholderData || act.isPending}
          onPage={(next) => router.replace(reviewPageHref(pathname, dir, next, next === page + 1 ? q.data?.nextCursor ?? undefined : undefined), { scroll: false })} />
      ) : null}

      <ApproveDialog open={target?.mode === "approve"} orgId={orgId} jobId={target?.item.id ?? ""} reference={target?.item.reference ?? ""} loading={act.isPending} allowWithoutEvidence={me?.policies?.allowApprovalWithoutEvidence === true}
        onConfirm={(note, version) => target && act.mutate({ item: { ...target.item, version }, note })} onCancel={close} />
      <ReasonDialog open={target?.mode === "sendBack"} title={`${t("b2b.review.sendBackTitle", "Send back")} ${target?.item.reference ?? ""}`}
        description={t("b2b.review.sendBackBody", "The job returns to In progress and the team is notified.")}
        reasonLabel={t("b2b.review.reasonLabel", "What needs to be fixed?")} confirmLabel={t("b2b.review.sendBack", "Send back")}
        loading={act.isPending} onConfirm={(reason) => target && act.mutate({ item: target.item, reason })} onCancel={close} />
    </div>
  );
}
