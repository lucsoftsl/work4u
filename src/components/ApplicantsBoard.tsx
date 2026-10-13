"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowRight, Bookmark, CheckCircle2, Eye, MessageSquare, Star, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { ApiError, errorMessage } from "@/lib/http";
import { chatHref } from "@/lib/chat-links";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MoneyPlate } from "@/components/ui/MoneyPlate";
import { StatusChip } from "@/components/ui/StatusChip";
import type { Application, ApplicationStatus, Job } from "@/api/types";

interface ApplicantsBoardProps {
  job: Job;
  applicants: Application[];
  firebaseToken: string | null;
  /** "split": list + detail pane from lg (job page). "stack": full cards (applicants page). */
  variant: "split" | "stack";
  onApplicationUpdated: (application: Application) => void;
  /** Reload job + applicants (after a hire, or when the server reports a conflict). */
  onReload: () => void;
  showGoToJob?: boolean;
}

function Avatar({ name, image, size }: { name: string; image?: string | null; size: 40 | 64 }) {
  const box = size === 64 ? "h-16 w-16 text-h3" : "h-10 w-10 text-label";
  if (image) {
    return <Image src={image} alt="" width={size} height={size} className={cn("shrink-0 rounded-full object-cover", box)} />;
  }
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-display font-bold text-primary", box)}>
      {name.charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function Rating({ rating, reviews }: { rating: number; reviews: number }) {
  const { t } = useTranslation();
  if (reviews <= 0) {
    return <span className="rounded-control bg-info-soft px-1.5 text-micro text-info">{t("jobs.newOnWork4u")}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-label font-normal tabular text-ink-muted">
      <Star className="h-3.5 w-3.5 fill-money text-money" aria-hidden="true" />
      <span className="font-bold text-money">{rating.toFixed(1)}</span>
      <span>· {reviews} {t("jobDetail.reviews")}</span>
    </span>
  );
}

export function ApplicantsBoard({ job, applicants, firebaseToken, variant, onApplicationUpdated, onReload, showGoToJob }: ApplicantsBoardProps) {
  const { t } = useTranslation();
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<Application | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const nameOf = (application: Application) => application.applicant?.name || t("applicants.fallbackName");
  const selected = applicants.find((a) => a.id === selectedId) ?? applicants[0];
  const hourlySuffix = job.budgetType === "HOURLY" ? t("jobs.perHour") : undefined;

  async function updateStatus(application: Application, status: ApplicationStatus) {
    if (!firebaseToken) return;
    setActingOnId(application.id);
    setActionError(null);
    try {
      const updated = await api.updateApplicationStatus(application.id, status, firebaseToken);
      onApplicationUpdated(updated);
      if (status === "ACCEPTED") {
        setAcceptTarget(null);
        onReload(); // other applicants are auto-rejected server-side
      }
    } catch (err) {
      console.error("Failed to update application:", err);
      const conflict = err instanceof ApiError ? err.status === 409 : /409|already|conflict|filled/i.test(String((err as Error)?.message));
      setActionError(conflict ? t("applicants.conflict") : errorMessage(err, t("applicants.errorUpdate")));
      setAcceptTarget(null);
      if (conflict) onReload();
    } finally {
      setActingOnId(null);
    }
  }

  const renderActions = (application: Application) => {
    const isHired = job.hiredWorkerId === application.applicantId;
    const acting = actingOnId === application.id;
    const canAct = job.lifecycleStatus === "OPEN" && application.status !== "WITHDRAWN";
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          href={chatHref({ userId: application.applicantId, userName: application.applicant?.name, jobId: job.id, jobTitle: job.title })}
          className={buttonClasses("secondary", "sm")}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          {t("applicants.message")}
          <span className="sr-only">{nameOf(application)}</span>
        </Link>
        {isHired && showGoToJob ? (
          <Link href={`/jobs/${job.id}`} className={buttonClasses("primary", "sm")}>
            {t("applicants.goToJob")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
        {canAct && application.status === "PENDING" ? (
          <Button variant="secondary" size="sm" disabled={acting} onClick={() => updateStatus(application, "VIEWED")}>
            <Eye className="h-4 w-4" aria-hidden="true" />
            {t("applicants.markViewed")}
          </Button>
        ) : null}
        {canAct && application.status !== "SHORTLISTED" ? (
          <Button variant="secondary" size="sm" disabled={acting} onClick={() => updateStatus(application, "SHORTLISTED")}>
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            {t("applicants.shortlist")}
          </Button>
        ) : null}
        {canAct && application.status !== "REJECTED" ? (
          <Button
            variant="secondary"
            size="sm"
            className="border-danger text-danger hover:bg-danger-soft"
            disabled={acting}
            onClick={() => updateStatus(application, "REJECTED")}
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            {t("applicants.reject")}
          </Button>
        ) : null}
        {canAct ? (
          <Button size="sm" className="sm:ml-auto" disabled={acting} onClick={() => setAcceptTarget(application)}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t("applicants.acceptHire")}
          </Button>
        ) : null}
      </div>
    );
  };

  const renderFacts = (application: Application) =>
    application.proposedRate != null || application.proposedDuration ? (
      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-label font-normal text-ink-muted">
        {application.proposedRate != null ? (
          <div className="flex items-baseline gap-2">
            <dt>{t("applicants.proposedRate")}</dt>
            <dd>
              <MoneyPlate size="inline" amount={application.proposedRate} currency={job.budgetCurrency} suffix={hourlySuffix} />
            </dd>
          </div>
        ) : null}
        {application.proposedDuration ? (
          <div className="flex items-baseline gap-2">
            <dt>{t("applicants.duration")}</dt>
            <dd className="font-bold text-ink">{application.proposedDuration}</dd>
          </div>
        ) : null}
      </dl>
    ) : null;

  const renderChips = (application: Application) => (
    <span className="flex flex-wrap items-center gap-2">
      <StatusChip kind="application" value={application.status} />
      {job.hiredWorkerId === application.applicantId ? <StatusChip kind="stage" value="HIRED" label={t("applicants.hired")} /> : null}
    </span>
  );

  return (
    <div className="space-y-4">
      {actionError ? (
        <p role="alert" className="flex items-start gap-2 rounded-card border-l-4 border-danger bg-danger-soft p-3 text-label font-normal text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          {actionError}
        </p>
      ) : null}

      <div className={cn(variant === "split" && "grid gap-6 lg:grid-cols-12")}>
        <ul className={cn("space-y-3", variant === "split" && "lg:col-span-5")}>
          {applicants.map((application) => {
            const isSelected = variant === "split" && selected?.id === application.id;
            return (
              <li
                key={application.id}
                className={cn(
                  "relative rounded-card border bg-surface p-4 md:p-5",
                  isSelected ? "lg:border-2 lg:border-primary" : "border-line",
                  variant === "split" && "lg:hover:border-line-strong"
                )}
              >
                {variant === "split" ? (
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(application.id)}
                    className="absolute inset-0 hidden rounded-card lg:block"
                  >
                    <span className="sr-only">{t("applicants.showDetails").replace("{name}", nameOf(application))}</span>
                  </button>
                ) : null}
                <div className="flex items-start gap-3">
                  <Avatar name={nameOf(application)} image={application.applicant?.image} size={40} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="min-w-0 break-words font-display text-[1.0625rem] font-semibold text-ink">{nameOf(application)}</h3>
                      {renderChips(application)}
                    </div>
                    <Rating rating={application.applicant?.rating ?? 0} reviews={application.applicant?.reviews ?? 0} />
                  </div>
                </div>
                {application.coverLetter ? (
                  <p className={cn("mt-3 whitespace-pre-line break-words text-body text-ink-muted", variant === "split" && "lg:line-clamp-2")}>
                    {application.coverLetter}
                  </p>
                ) : null}
                <div className="mt-3">{renderFacts(application)}</div>
                <div className={cn("relative mt-4 border-t border-line pt-4", variant === "split" && "lg:hidden")}>{renderActions(application)}</div>
              </li>
            );
          })}
        </ul>

        {variant === "split" && selected ? (
          <section
            aria-label={t("applicants.detailAria").replace("{name}", nameOf(selected))}
            className="hidden self-start rounded-card border border-line bg-surface p-6 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:col-span-7 lg:block"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
              <div className="flex min-w-0 items-start gap-4">
                <Avatar name={nameOf(selected)} image={selected.applicant?.image} size={64} />
                <div className="min-w-0 space-y-1.5">
                  <p className="break-words font-display text-h3 text-ink">{nameOf(selected)}</p>
                  <Rating rating={selected.applicant?.rating ?? 0} reviews={selected.applicant?.reviews ?? 0} />
                  {renderChips(selected)}
                </div>
              </div>
              {selected.proposedRate != null ? (
                <MoneyPlate amount={selected.proposedRate} currency={job.budgetCurrency} label={t("applicants.proposedRateLabel")} suffix={hourlySuffix} />
              ) : null}
            </div>
            <div className="space-y-2 border-b border-line py-5">
              <p className="text-micro uppercase text-ink-muted">{t("applicants.coverLetter")}</p>
              <p className="whitespace-pre-line break-words text-body text-ink">{selected.coverLetter || t("applicants.noCoverLetter")}</p>
              {selected.proposedDuration ? (
                <p className="pt-2 text-label font-normal text-ink-muted">
                  {t("applicants.duration")} <span className="font-bold text-ink">{selected.proposedDuration}</span>
                </p>
              ) : null}
            </div>
            <div className="pt-5">{renderActions(selected)}</div>
          </section>
        ) : null}
      </div>

      <ConfirmDialog
        open={acceptTarget !== null}
        title={acceptTarget ? t("applicants.acceptTitle").replace("{name}", nameOf(acceptTarget)) : ""}
        description={t("applicants.confirmAccept")}
        confirmLabel={t("applicants.acceptHire")}
        loading={acceptTarget !== null && actingOnId === acceptTarget.id}
        onConfirm={() => {
          if (acceptTarget) void updateStatus(acceptTarget, "ACCEPTED");
        }}
        onCancel={() => setAcceptTarget(null)}
      />
    </div>
  );
}
