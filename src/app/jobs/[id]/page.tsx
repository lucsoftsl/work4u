"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertOctagon,
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  Edit2,
  MapPin,
  MessageCircle,
  RotateCcw,
  SearchX,
  Send,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MoneyPlate } from "@/components/ui/MoneyPlate";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from "@/components/ui/QueryState";
import { ApplicantsBoard } from "@/components/ApplicantsBoard";
import { JobApplySidebar } from "@/components/JobApplySidebar";
import { JobChecklist } from "@/components/JobChecklist";
import { QuestStageTracker } from "@/components/QuestStageTracker";
import { JobWorkPhotos } from "@/components/JobWorkPhotos";
import { JobPaymentCard } from "@/components/JobPaymentCard";
import { ReportButton } from "@/components/ReportButton";
import { ReviewForm } from "@/components/ReviewForm";
import { PosterMiniTrust, formatTimeAgo } from "@/components/JobCard";
import { api } from "@/lib/api";
import { ApiError, apiJson, errorMessage } from "@/lib/http";
import { chatHref } from "@/lib/chat-links";
import { fetchMessagesWithUser } from "@/api";
import { reviewsApi } from "@/lib/reviews-api";
import { useChatWebSocket, type ChatMessage } from "@/hooks/useChatWebSocket";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useTranslation } from "@/lib/i18n";
import { getCategoryName } from "@/lib/category-utils";
import { handleJobCompletion } from "@/lib/gamification-utils";
import { cn } from "@/lib/utils";
import type { Application, Job, Review } from "@/api/types";

type ConfirmKind = "complete" | "cancel" | "delete";

const CARD = "rounded-card border border-line bg-surface p-4 md:p-6";

function InlineAlert({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-card border-l-4 border-danger bg-danger-soft p-3 text-label font-normal text-ink">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
      {message}
    </p>
  );
}

/** Inline chat with the poster, for everyone except the poster. */
function JobChatPanel({ job, firebaseToken, userId }: { job: Job; firebaseToken: string | null; userId?: string }) {
  const { t } = useTranslation();
  const { addNotification } = useChat();
  const partnerId = job.createdByUserId;
  const [input, setInput] = useState("");
  const [httpMessages, setHttpMessages] = useState<ChatMessage[]>([]);
  const { isConnected, messages: wsMessages, outbox, sendMessage, retryMessage, error: chatError, isLoadingHistory } = useChatWebSocket(
    firebaseToken,
    partnerId
  );

  // Fallback: fetch chat history over HTTP so messages appear even without the socket.
  useEffect(() => {
    if (!firebaseToken) return;
    let isActive = true;
    fetchMessagesWithUser(firebaseToken, partnerId, { limit: 50 })
      .then((history) => {
        if (isActive && Array.isArray(history)) setHttpMessages(history as ChatMessage[]);
      })
      .catch((err) => console.error("Failed to fetch HTTP chat history:", err));
    return () => {
      isActive = false;
    };
  }, [firebaseToken, partnerId]);

  // Notify about incoming messages (not while history loads).
  useEffect(() => {
    if (isLoadingHistory || wsMessages.length === 0) return;
    const last = wsMessages[wsMessages.length - 1];
    if (last.isSent) return;
    addNotification({
      id: last.id,
      fromUserId: last.fromUserId,
      toUserId: last.toUserId,
      message: last.message,
      dateTimeCreated: last.dateTimeCreated,
      isSent: false,
      isRead: false,
      senderName: job.createdBy.name,
      jobId: job.id,
    });
  }, [wsMessages, job.id, job.createdBy.name, addNotification, isLoadingHistory]);

  const displayMessages = useMemo(() => {
    const combined = [...httpMessages, ...wsMessages];
    return Array.from(new Map(combined.map((m) => [m.id, m])).values())
      .filter((msg) => msg.jobData?.id === job.id)
      .filter((msg) => !userId || msg.fromUserId === userId || msg.toUserId === userId)
      .map((msg) => ({
        id: msg.id,
        mine: msg.fromUserId === userId,
        text: msg.message?.text ?? "",
        timestamp: msg.dateTimeCreated,
        seen: msg.isRead,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [httpMessages, wsMessages, userId, job.id]);

  const pending = outbox.filter((item) => item.toUserId === partnerId && item.jobData?.id === job.id);

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || !firebaseToken) return;
    if (sendMessage({ toUserId: partnerId, text, jobData: { id: job.id, title: job.title } })) setInput("");
  };

  return (
    <section id="job-chat" aria-labelledby="job-chat-title" className={cn(CARD, "flex h-[28rem] flex-col scroll-mt-[calc(var(--header-h)+1rem)]")}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="job-chat-title" className="font-display text-h3 text-ink">
            {t("jobDetail.chatWithPoster")}
          </h2>
          <p className="truncate text-label font-normal text-ink-muted">{job.createdBy.name}</p>
        </div>
        {firebaseToken ? (
          <span className="inline-flex items-center gap-1.5 text-caption text-ink-muted">
            <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", isConnected ? "bg-success" : "bg-ink-subtle")} />
            {isConnected ? t("jobDetail.connected") : t("jobDetail.connecting")}
          </span>
        ) : null}
      </div>

      {!firebaseToken ? (
        <p className="mb-3 rounded-control bg-info-soft p-3 text-label font-normal text-ink">{t("jobDetail.signInToChat")}</p>
      ) : null}
      {chatError ? <div className="mb-3"><InlineAlert message={chatError} /></div> : null}

      <div role="log" aria-live="polite" aria-label={t("jobDetail.chatWithPoster")} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {isLoadingHistory ? (
          <div className="space-y-3" aria-hidden="true">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
          </div>
        ) : displayMessages.length === 0 && pending.length === 0 ? (
          <p className="py-4 text-center text-label font-normal text-ink-muted">{t("jobDetail.startConversation")}</p>
        ) : (
          <>
            {displayMessages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-card px-3 py-2", msg.mine ? "bg-primary text-on-fill" : "bg-sunken text-ink")}>
                  <p className="whitespace-pre-wrap break-words text-body">{msg.text}</p>
                  <p className="mt-1 text-micro font-normal tabular">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {msg.mine ? ` · ${msg.seen ? t("jobDetail.msgSeen") : t("jobDetail.msgDelivered")}` : ""}
                  </p>
                </div>
              </div>
            ))}
            {pending.map((item) => (
              <div key={item.clientId} className="flex justify-end">
                <div className={cn("max-w-[85%] rounded-card px-3 py-2", item.status === "failed" ? "border border-danger bg-danger-soft text-ink" : "bg-primary/80 text-on-fill")}>
                  <p className="whitespace-pre-wrap break-words text-body">{item.text}</p>
                  {item.status === "failed" ? (
                    <p className="mt-1 flex items-center gap-2 text-micro text-danger">
                      {t("jobDetail.sendFailed")}
                      <Button variant="ghost" size="sm" onClick={() => retryMessage(item.clientId)}>
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("common.retry")}
                      </Button>
                    </p>
                  ) : (
                    <p className="mt-1 text-micro font-normal">{t("jobDetail.sending")}</p>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <form onSubmit={handleSend} className="mt-3 flex shrink-0 items-center gap-2">
        <label htmlFor="job-chat-input" className="sr-only">
          {t("jobDetail.writeMessage")}
        </label>
        <input
          id="job-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("jobDetail.writeMessage")}
          disabled={!firebaseToken}
          autoComplete="off"
          className="min-h-[48px] min-w-0 flex-1 rounded-control border border-line-strong bg-surface px-3 text-body text-ink placeholder:text-ink-subtle hover:border-ink-muted focus:border-primary focus:outline-none focus:shadow-focus disabled:cursor-not-allowed disabled:bg-sunken"
        />
        <Button type="submit" size="icon" className="h-12 w-12" disabled={!firebaseToken || !input.trim()} aria-label={t("jobDetail.sendMessage")}>
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </section>
  );
}

function DetailSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-content px-4 py-6 md:px-6 md:py-10" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid gap-6 pt-4 lg:grid-cols-12">
          <Skeleton className="h-72 lg:col-span-8" />
          <Skeleton className="h-72 lg:col-span-4" />
        </div>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string | undefined;
  const { t, locale } = useTranslation();
  const { firebaseToken, user } = useAuth();

  const [job, setJob] = useState<Job | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [jobReloadKey, setJobReloadKey] = useState(0);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [busy, setBusy] = useState<ConfirmKind | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [myReview, setMyReview] = useState<Review | null | undefined>(undefined);
  const [contact, setContact] = useState<{ forId: string; name: string | null } | null>(null);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(true);
  const [applicantsError, setApplicantsError] = useState<string | null>(null);
  const [applicantsKey, setApplicantsKey] = useState(0);

  const isPoster = Boolean(job && user?.id === job.createdByUserId);
  const isHiredWorker = Boolean(job && user?.id && user.id === job.hiredWorkerId);
  const participant = isPoster || isHiredWorker;
  const otherParticipantId = isPoster ? job?.hiredWorkerId : job?.createdByUserId;
  const lifecycle = job?.lifecycleStatus;
  const activeWork = lifecycle === "IN_PROGRESS" || lifecycle === "COMPLETED";
  const showOwnerApplicants = isPoster && lifecycle === "OPEN";
  const hiredWorkerId = job?.hiredWorkerId ?? null;
  const hiredWorkerName = isPoster && contact && contact.forId === hiredWorkerId ? contact.name : null;
  const reviewApplicable = Boolean(job && lifecycle === "COMPLETED" && user?.id && participant);

  useEffect(() => {
    if (!jobId) return;
    let isActive = true;
    api
      .getJob(jobId)
      .then((data) => {
        if (!isActive) return;
        setJob(data);
        setLoadError(null);
      })
      .catch((error) => {
        console.error("Failed to load job", error);
        if (!isActive) return;
        // A missing job shows the not-found state; anything else is a retryable error.
        if (/not found/i.test(String((error as Error)?.message))) setJob(undefined);
        else setLoadError(errorMessage(error, t("common.loadError")));
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [jobId, jobReloadKey, t]);

  // Poster only: resolve the hired worker's name for the "Message hired worker" link.
  useEffect(() => {
    if (!isPoster || !hiredWorkerId || !jobId || !firebaseToken) return;
    let isActive = true;
    apiJson<{ displayName?: string }>(`/api/jobs/${jobId}/contact`, { auth: true })
      .then((data) => {
        if (isActive) setContact({ forId: hiredWorkerId, name: data?.displayName || null });
      })
      .catch(() => {
        // Optional nicety only; the link works without a name.
      });
    return () => {
      isActive = false;
    };
  }, [isPoster, hiredWorkerId, jobId, firebaseToken]);

  // Poster of an open job: load applicants for the inline review list.
  useEffect(() => {
    if (!showOwnerApplicants || !jobId || !firebaseToken) return;
    let isActive = true;
    api
      .getJobApplicants(jobId, firebaseToken)
      .then((data) => {
        if (!isActive) return;
        setApplicants(data);
        setApplicantsError(null);
      })
      .catch((err) => {
        console.error("Failed to load applicants:", err);
        if (isActive) setApplicantsError(errorMessage(err, t("applicants.errorLoad")));
      })
      .finally(() => {
        if (isActive) setApplicantsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [showOwnerApplicants, jobId, firebaseToken, applicantsKey, t]);

  // Once the job is completed, check whether the current participant already left a review.
  useEffect(() => {
    if (!reviewApplicable || !job || !user?.id) return;
    let isActive = true;
    reviewsApi
      .listReviews({ jobId: job.id, createdByUserId: user.id })
      .then((reviews) => {
        if (isActive) setMyReview(reviews[0] ?? null);
      })
      .catch((err) => {
        console.error("Failed to check existing review:", err);
        if (isActive) setMyReview(null);
      });
    return () => {
      isActive = false;
    };
  }, [reviewApplicable, job, user?.id]);

  const runConfirmed = async () => {
    if (!job || !firebaseToken || !jobId || !confirm) return;
    const kind = confirm;
    setBusy(kind);
    setActionError(null);
    try {
      if (kind === "complete") {
        const updated = await api.completeJob(jobId, firebaseToken);
        setJob(updated);
        handleJobCompletion(updated.budget);
      } else if (kind === "cancel") {
        const updated = await api.cancelJob(jobId, firebaseToken);
        setJob((prev) => {
          if (updated?.id) return { ...updated, lifecycleStatus: "CANCELLED" };
          return prev ? { ...prev, lifecycleStatus: "CANCELLED" } : prev;
        });
      } else {
        await api.deleteJob(jobId, firebaseToken);
        router.push("/my-jobs");
      }
    } catch (error) {
      console.error(`Failed to ${kind} job:`, error);
      if (kind === "cancel" && error instanceof ApiError && error.status === 409) setActionError(t("jobDetail.cancelConflict"));
      else if (error instanceof ApiError && error.status === 429) setActionError(t("jobDetail.rateLimited"));
      else if (kind === "cancel") setActionError(errorMessage(error, t("jobDetail.cancelError")));
      else if (kind === "complete") setActionError(errorMessage(error, t("jobDetail.completeError")));
      else setActionError(t("jobDetail.deleteError"));
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  if (loading && !job) return <DetailSkeleton label={t("jobDetail.loading")} />;

  if (loadError && !job) {
    return (
      <div className="mx-auto w-full max-w-content px-4 py-6 md:px-6 md:py-10">
        <h1 className="sr-only">{t("jobDetail.pageTitle")}</h1>
        <ErrorState message={loadError} onRetry={() => setJobReloadKey((n) => n + 1)} />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10 md:py-16">
        <h1 className="sr-only">{t("jobDetail.jobNotFound")}</h1>
        <EmptyState
          icon={SearchX}
          title={t("jobDetail.jobNotFound")}
          description={t("jobDetail.jobNotFoundDesc")}
          action={
            <Link href="/jobs" className={buttonClasses("primary")}>
              {t("jobDetail.backToJobs")}
            </Link>
          }
        />
      </div>
    );
  }

  const hourly = job.budgetType === "HOURLY";
  const moneyLabel = hourly ? t("jobs.hourlyRate") : t("jobs.fixedBudget");
  const moneySuffix = hourly ? t("jobs.perHour") : undefined;
  const postedAgo = formatTimeAgo(job.dateTimeCreated, locale);
  const messageHiredHref = hiredWorkerId
    ? chatHref({ userId: hiredWorkerId, userName: hiredWorkerName, jobId: job.id, jobTitle: job.title })
    : null;
  const otherName = isPoster ? hiredWorkerName || t("jobDetail.theWorker") : job.createdBy.name;

  const confirmCopy: Record<ConfirmKind, { title: string; body: string; label: string; tone: "primary" | "destructive" }> = {
    complete: { title: t("jobDetail.confirmCompleteTitle"), body: t("jobDetail.confirmCompleteBody"), label: t("jobDetail.markComplete"), tone: "primary" },
    cancel: { title: t("jobDetail.confirmCancelTitle"), body: t("jobDetail.confirmCancelJob"), label: t("jobDetail.cancelJob"), tone: "destructive" },
    delete: { title: t("jobDetail.confirmDeleteTitle"), body: t("jobDetail.confirmDelete"), label: t("jobDetail.deleteJob"), tone: "destructive" },
  };

  const ownerHeaderActions = isPoster ? (
    <div className="flex flex-wrap gap-2">
      {lifecycle === "OPEN" ? (
        <Link href={`/jobs/${job.id}/edit`} className={buttonClasses("secondary", "sm")}>
          <Edit2 className="h-4 w-4" aria-hidden="true" />
          {t("jobDetail.editJob")}
        </Link>
      ) : null}
      {lifecycle === "OPEN" || lifecycle === "IN_PROGRESS" ? (
        <Button variant="secondary" size="sm" className="border-danger text-danger hover:bg-danger-soft" loading={busy === "cancel"} onClick={() => setConfirm("cancel")}>
          {busy !== "cancel" ? <XCircle className="h-4 w-4" aria-hidden="true" /> : null}
          {busy === "cancel" ? t("jobDetail.cancellingJob") : t("jobDetail.cancelJob")}
        </Button>
      ) : null}
      {lifecycle === "OPEN" ? (
        <Button variant="destructive" size="sm" loading={busy === "delete"} onClick={() => setConfirm("delete")}>
          {busy !== "delete" ? <Trash2 className="h-4 w-4" aria-hidden="true" /> : null}
          {busy === "delete" ? t("jobDetail.deleting") : t("jobDetail.deleteJob")}
        </Button>
      ) : null}
    </div>
  ) : null;

  const completeButton =
    isPoster && lifecycle === "IN_PROGRESS" ? (
      <Button size="lg" className="w-full md:w-auto" loading={busy === "complete"} onClick={() => setConfirm("complete")}>
        {busy !== "complete" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : null}
        {busy === "complete" ? t("jobDetail.markingComplete") : t("jobDetail.markComplete")}
      </Button>
    ) : null;

  return (
    <div className={cn("mx-auto w-full max-w-content px-4 py-6 md:px-6 md:py-10", !isPoster && "pb-32 md:pb-10")}>
      <Link href={isPoster ? "/my-jobs" : "/jobs"} className={buttonClasses("ghost", "sm", "-ml-3")}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {isPoster ? t("workers.backToMyJobs") : t("jobDetail.backToJobs")}
      </Link>

      <header className={cn("mt-3", isPoster && CARD)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
              <span className="inline-flex h-7 items-center rounded-control bg-primary-soft px-2 font-bold text-primary">{getCategoryName(job.category, t)}</span>
              <StatusChip kind="job" value={job.lifecycleStatus} />
              {lifecycle === "IN_PROGRESS" ? <StatusChip kind="stage" value={job.workStage} /> : null}
              {!isPoster ? (
                <span className="inline-flex rounded-control border border-money/25 bg-money-soft px-2 py-0.5 lg:hidden">
                  <MoneyPlate size="inline" amount={job.budget} currency={job.budgetCurrency} suffix={moneySuffix} />
                </span>
              ) : null}
            </div>
            <h1 className="break-words font-display text-h1 text-ink">{job.title}</h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label font-normal text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="break-words">{job.remote ? t("jobDetail.remote") : job.location}</span>
              </span>
              {postedAgo ? (
                <span className="inline-flex items-center gap-1.5 tabular">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t("jobs.postedAgo").replace("{time}", postedAgo)}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 tabular">
                <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                {job.applicants} {t("jobs.applicantsCount")}
              </span>
            </p>
          </div>
          {isPoster ? (
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start lg:flex-col lg:items-end">
              <MoneyPlate size="lg" amount={job.budget} currency={job.budgetCurrency} label={moneyLabel} suffix={moneySuffix} />
              {ownerHeaderActions}
            </div>
          ) : null}
        </div>
      </header>

      {actionError ? (
        <div className="mt-4">
          <InlineAlert message={actionError} />
        </div>
      ) : null}

      {showOwnerApplicants ? (
        <section aria-labelledby="owner-applicants-title" className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="owner-applicants-title" className="font-display text-h2 text-ink">
              {t("jobDetail.applicantsHeading").replace("{count}", String(applicants.length))}
            </h2>
            <Link href={`/my-jobs/${job.id}/applicants`} className={buttonClasses("ghost", "sm")}>
              <Users className="h-4 w-4" aria-hidden="true" />
              {t("jobDetail.viewApplicants")}
            </Link>
          </div>
          {!firebaseToken || (applicantsLoading && applicants.length === 0) ? (
            <ListSkeleton rows={2} label={t("applicants.loading")} />
          ) : applicantsError ? (
            <ErrorState
              message={applicantsError}
              onRetry={() => {
                setApplicantsLoading(true);
                setApplicantsKey((n) => n + 1);
              }}
            />
          ) : applicants.length === 0 ? (
            <EmptyState icon={Users} title={t("applicants.emptyTitle")} description={t("applicants.emptyDesc")} />
          ) : (
            <ApplicantsBoard
              job={job}
              applicants={applicants}
              firebaseToken={firebaseToken}
              variant="split"
              onApplicationUpdated={(updated) => setApplicants((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))}
              onReload={() => {
                setJobReloadKey((n) => n + 1);
                setApplicantsKey((n) => n + 1);
              }}
            />
          )}
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-8">
          {activeWork && firebaseToken && participant ? (
            <QuestStageTracker
              job={job}
              firebaseToken={firebaseToken}
              isHiredWorker={isHiredWorker}
              hasReviewed={Boolean(myReview)}
              onUpdated={setJob}
              footer={completeButton}
            />
          ) : null}

          {lifecycle === "DISPUTED" ? (
            <div role="status" className="flex items-start gap-3 rounded-card border-l-4 border-danger bg-danger-soft p-4">
              <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
              <div>
                <p className="font-display text-h3 text-ink">{t("jobDetail.disputeTitle")}</p>
                <p className="mt-1 text-body text-ink">{t("jobDetail.disputeBody")}</p>
              </div>
            </div>
          ) : null}

          {lifecycle === "IN_PROGRESS" && firebaseToken && participant ? <JobChecklist jobId={job.id} firebaseToken={firebaseToken} /> : null}
          {activeWork && firebaseToken && participant ? <JobWorkPhotos jobId={job.id} firebaseToken={firebaseToken} currentUserId={user?.id} /> : null}
          {activeWork && firebaseToken && participant ? <JobPaymentCard job={job} firebaseToken={firebaseToken} isPoster={isPoster} onUpdated={setJob} /> : null}

          <section aria-labelledby="job-about-title" className={CARD}>
            <h2 id="job-about-title" className="font-display text-h3 text-ink">
              {t("jobDetail.aboutJob")}
            </h2>
            <p className="mt-3 whitespace-pre-line break-words text-body-lg text-ink-muted">{job.description}</p>
            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-control border border-line p-3">
                <dt className="text-micro uppercase text-ink-muted">{t("jobs.budgetType")}</dt>
                <dd className="mt-1 inline-flex items-center gap-1.5 text-label text-ink">
                  <BriefcaseBusiness className="h-4 w-4 text-primary" aria-hidden="true" />
                  {hourly ? t("jobs.hourlyRate") : t("jobs.fixedPrice")}
                </dd>
              </div>
              <div className="rounded-control border border-line p-3">
                <dt className="text-micro uppercase text-ink-muted">{t("jobDetail.workplace")}</dt>
                <dd className="mt-1 inline-flex items-center gap-1.5 text-label text-ink">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                  {job.remote ? t("jobDetail.remoteFriendly") : t("jobs.onSite")}
                </dd>
              </div>
              <div className="rounded-control border border-line p-3">
                <dt className="text-micro uppercase text-ink-muted">{t("jobDetail.applicants")}</dt>
                <dd className="mt-1 inline-flex items-center gap-1.5 text-label tabular text-ink">
                  <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                  {job.applicants}
                </dd>
              </div>
            </dl>
          </section>

          {!isPoster ? (
            <section aria-labelledby="job-poster-title" className={CARD}>
              <h2 id="job-poster-title" className="text-micro uppercase text-ink-muted">
                {t("jobDetail.postedBy")}
              </h2>
              <p className="mt-3 text-body">
                <PosterMiniTrust name={job.createdBy.name} image={job.createdBy.image} rating={job.createdBy.rating} reviews={job.createdBy.reviews} />
              </p>
            </section>
          ) : null}

          {!isPoster ? <JobChatPanel job={job} firebaseToken={firebaseToken} userId={user?.id} /> : null}

          {activeWork && firebaseToken && otherParticipantId && participant ? (
            <ReportButton
              reportedUserId={otherParticipantId}
              reportedUserName={otherName}
              jobId={job.id}
              firebaseToken={firebaseToken}
              onSubmitted={() => setJob((prev) => (prev ? { ...prev, lifecycleStatus: "DISPUTED" } : prev))}
            />
          ) : null}
        </div>

        <aside className="min-w-0 lg:col-span-4">
          <div className="space-y-6 lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
            {isPoster ? (
              <section aria-labelledby="owner-panel-title" className={cn(CARD, "space-y-3")}>
                <h2 id="owner-panel-title" className="font-display text-h3 text-ink">
                  {t("jobDetail.messagesTitle")}
                </h2>
                {lifecycle === "CANCELLED" ? (
                  <p role="status" className="rounded-control bg-sunken p-3 text-label font-normal text-ink-muted">
                    {t("jobDetail.jobCancelled")}
                  </p>
                ) : null}
                {messageHiredHref ? (
                  <Link href={messageHiredHref} className={buttonClasses("primary", "default", "w-full")}>
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    <span className="truncate">
                      {hiredWorkerName ? `${t("jobDetail.messageHiredWorker")} · ${hiredWorkerName}` : t("jobDetail.messageHiredWorker")}
                    </span>
                  </Link>
                ) : (
                  <p className="text-label font-normal text-ink-muted">{t("jobDetail.posterChatHint")}</p>
                )}
                {!showOwnerApplicants ? (
                  <Link href={`/my-jobs/${job.id}/applicants`} className={buttonClasses("secondary", "default", "w-full")}>
                    <Users className="h-4 w-4" aria-hidden="true" />
                    {t("jobDetail.viewApplicants")}
                  </Link>
                ) : null}
                <Link href="/chat" className={buttonClasses("ghost", "default", "w-full")}>
                  {t("jobDetail.openInbox")}
                </Link>
              </section>
            ) : (
              <section aria-labelledby="apply-panel-title" className={cn(CARD, "space-y-4")}>
                <h2 id="apply-panel-title" className="sr-only">
                  {t("jobDetail.applyToJob")}
                </h2>
                <MoneyPlate size="lg" className="w-full" amount={job.budget} currency={job.budgetCurrency} label={moneyLabel} suffix={moneySuffix} />
                <JobApplySidebar job={job} firebaseToken={firebaseToken} userId={user?.id} stickyBar />
                <Link
                  href={chatHref({ userId: job.createdByUserId, userName: job.createdBy.name, jobId: job.id, jobTitle: job.title })}
                  className={buttonClasses("secondary", "default", "w-full")}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {t("jobDetail.messagePoster")}
                </Link>
              </section>
            )}

            {reviewApplicable && firebaseToken && otherParticipantId && myReview !== undefined ? (
              myReview ? (
                <p className={cn(CARD, "flex items-start gap-2 text-body text-ink-muted")}>
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                  {t("jobDetail.reviewThanks").replace("{rating}", String(myReview.ratingCount))}
                </p>
              ) : (
                <ReviewForm jobId={job.id} targetUserId={otherParticipantId} targetName={otherName} firebaseToken={firebaseToken} onSubmitted={setMyReview} />
              )
            ) : null}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? confirmCopy[confirm].title : ""}
        description={confirm ? confirmCopy[confirm].body : undefined}
        confirmLabel={confirm ? confirmCopy[confirm].label : ""}
        tone={confirm ? confirmCopy[confirm].tone : "primary"}
        loading={busy !== null}
        onConfirm={() => void runConfirmed()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
