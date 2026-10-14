"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "@/components/LocaleLink";
import { AlertCircle, Send } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { MoneyPlate } from "@/components/ui/MoneyPlate";
import { StatusChip } from "@/components/ui/StatusChip";
import { api } from "@/lib/api";
import { signInPath } from "@/lib/auth-redirect";
import { errorMessage } from "@/lib/http";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { handleJobApplication } from "@/lib/gamification-utils";
import type { Application, Job } from "@/api/types";

const WITHDRAWABLE_STATUSES: Application["status"][] = ["PENDING", "VIEWED", "SHORTLISTED"];

interface JobApplySidebarProps {
  job: Job;
  firebaseToken: string | null;
  userId: string | undefined;
  /** Mobile only (< md): a sticky bottom bar with the budget and the Apply action. */
  stickyBar?: boolean;
}

function InlineError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-control bg-danger-soft p-3 text-label font-normal text-ink">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
      {message}
    </p>
  );
}

export function JobApplySidebar({ job, firebaseToken, userId, stickyBar }: JobApplySidebarProps) {
  const { t } = useTranslation();

  const [fetchedApplication, setMyApplication] = useState<Application | null | undefined>(undefined);
  // Signed out (or no user id yet): there is nothing to look up.
  const myApplication = firebaseToken && userId ? fetchedApplication : null;
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [proposedDuration, setProposedDuration] = useState("");
  const [rateError, setRateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelInView, setPanelInView] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!firebaseToken || !userId) return;
    let isActive = true;

    api
      .getMyApplications(userId, firebaseToken)
      .then((applications) => {
        if (!isActive) return;
        const existing = applications.find((application) => application.jobId === job.id);
        setMyApplication(existing ?? null);
      })
      .catch((err) => {
        console.error("Failed to check application status:", err);
        if (isActive) setMyApplication(null);
      });

    return () => {
      isActive = false;
    };
  }, [firebaseToken, userId, job.id]);

  // Hide the sticky bar while the panel itself is on screen.
  useEffect(() => {
    const node = panelRef.current;
    if (!stickyBar || !node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setPanelInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [stickyBar]);

  const goToForm = () => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    coverRef.current?.focus({ preventScroll: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firebaseToken) return;

    const rate = proposedRate.trim() ? Number(proposedRate) : undefined;
    if (rate !== undefined && (!Number.isFinite(rate) || rate <= 0)) {
      setRateError(t("jobDetail.rateInvalid"));
      return;
    }
    setRateError(null);
    setSubmitting(true);
    setError(null);
    try {
      const application = await api.applyToJob(
        job.id,
        { coverLetter: coverLetter.trim() || undefined, proposedRate: rate, proposedDuration: proposedDuration.trim() || undefined },
        firebaseToken
      );
      setMyApplication(application);
      handleJobApplication();
    } catch (err) {
      console.error("Failed to apply to job:", err);
      setError(errorMessage(err, t("jobDetail.applyError")));
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!firebaseToken || !myApplication) return;
    setWithdrawing(true);
    setError(null);
    try {
      const updated = await api.updateApplicationStatus(myApplication.id, "WITHDRAWN", firebaseToken);
      setMyApplication(updated);
    } catch (err) {
      console.error("Failed to withdraw application:", err);
      setError(errorMessage(err, t("jobDetail.withdrawError")));
    } finally {
      setWithdrawing(false);
    }
  };

  const hourly = job.budgetType === "HOURLY";
  const canApply = Boolean(firebaseToken) && myApplication === null && job.lifecycleStatus === "OPEN";
  const signInHref = signInPath(`/jobs/${job.id}`);

  let body: ReactNode;
  if (!firebaseToken) {
    body = (
      <Link href={signInHref} className={buttonClasses("primary", "lg", "w-full")}>
        {t("jobDetail.signInToApply")}
      </Link>
    );
  } else if (myApplication === undefined) {
    body = (
      <Button size="lg" className="w-full" loading disabled>
        {t("jobDetail.applyToJob")}
      </Button>
    );
  } else if (myApplication) {
    body = (
      <div className="space-y-3">
        <p className="text-label text-ink">{t("jobDetail.alreadyApplied")}</p>
        <StatusChip kind="application" value={myApplication.status} />
        {error ? <InlineError message={error} /> : null}
        {WITHDRAWABLE_STATUSES.includes(myApplication.status) ? (
          <Button variant="secondary" className="w-full" onClick={handleWithdraw} loading={withdrawing}>
            {withdrawing ? t("jobDetail.withdrawing") : t("jobDetail.withdrawApplication")}
          </Button>
        ) : null}
      </div>
    );
  } else if (job.lifecycleStatus !== "OPEN") {
    body = (
      <p role="status" className="rounded-control bg-sunken p-3 text-label font-normal text-ink-muted">
        {t("jobDetail.notAcceptingApplications")}
      </p>
    );
  } else {
    body = (
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Textarea
          ref={coverRef}
          label={t("jobDetail.coverLetter")}
          rows={4}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          placeholder={t("jobDetail.coverLetterPlaceholder")}
        />
        <Input
          label={`${t("jobDetail.proposedRate")} · ${job.budgetCurrency}${hourly ? ` ${t("jobs.perHour")}` : ""}`}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={proposedRate}
          error={rateError}
          onChange={(e) => setProposedRate(e.target.value)}
        />
        <Input label={t("jobDetail.proposedDuration")} value={proposedDuration} onChange={(e) => setProposedDuration(e.target.value)} />
        {error ? <InlineError message={error} /> : null}
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {!submitting ? <Send className="h-4 w-4" aria-hidden="true" /> : null}
          {submitting ? t("jobDetail.applying") : t("jobDetail.submitApplication")}
        </Button>
      </form>
    );
  }

  const showBar = stickyBar && !panelInView && (canApply || !firebaseToken);

  return (
    <>
      <div ref={panelRef} id="apply-panel" className="scroll-mt-[calc(var(--header-h)+1rem)]">
        {body}
      </div>
      {showBar ? (
        <div
          className={cn(
            "fixed inset-x-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 shadow-raised md:hidden",
            userId ? "bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))]" : "bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          )}
        >
          <div className="min-w-0">
            <p className="text-micro uppercase text-ink-muted">{hourly ? t("jobs.hourlyRate") : t("jobs.fixedBudget")}</p>
            <MoneyPlate size="inline" className="text-h3" amount={job.budget} currency={job.budgetCurrency} suffix={hourly ? t("jobs.perHour") : undefined} />
          </div>
          {firebaseToken ? (
            <Button size="lg" className="shrink-0" onClick={goToForm}>
              {t("jobDetail.applyNow")}
            </Button>
          ) : (
            <Link href={signInHref} className={buttonClasses("primary", "lg", "shrink-0")}>
              {t("jobDetail.signInToApply")}
            </Link>
          )}
        </div>
      ) : null}
    </>
  );
}
