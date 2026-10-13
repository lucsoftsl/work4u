"use client";

import { useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, Flag, Handshake, Truck, Wrench, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/http";
import type { Job, JobWorkStage } from "@/api/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";

interface QuestStageTrackerProps {
  job: Job;
  firebaseToken: string;
  isHiredWorker: boolean;
  hasReviewed: boolean;
  onUpdated: (job: Job) => void;
  /** Rendered right under the tracker (e.g. the poster's "Mark complete"). */
  footer?: ReactNode;
}

type StageKey = JobWorkStage | "COMPLETED";

const STAGES: { key: StageKey; labelKey: string; icon: LucideIcon }[] = [
  { key: "HIRED", labelKey: "status.stage.HIRED", icon: Handshake },
  { key: "EN_ROUTE", labelKey: "status.stage.EN_ROUTE", icon: Truck },
  { key: "STARTED", labelKey: "status.stage.STARTED", icon: Wrench },
  { key: "AWAITING_REVIEW", labelKey: "status.stage.AWAITING_REVIEW", icon: ClipboardCheck },
  { key: "COMPLETED", labelKey: "status.job.COMPLETED", icon: Flag },
];

const NEXT_STAGE: Partial<Record<JobWorkStage, { target: "EN_ROUTE" | "STARTED" | "AWAITING_REVIEW"; ctaKey: string }>> = {
  HIRED: { target: "EN_ROUTE", ctaKey: "questTracker.cta.enRoute" },
  EN_ROUTE: { target: "STARTED", ctaKey: "questTracker.cta.started" },
  STARTED: { target: "AWAITING_REVIEW", ctaKey: "questTracker.cta.awaitingReview" },
};

function stageIndex(job: Job): number {
  if (job.lifecycleStatus === "COMPLETED") return STAGES.length - 1;
  return STAGES.findIndex((s) => s.key === job.workStage);
}

/** Work-stage progress: vertical on mobile, horizontal from md. The hired worker advances the stage. */
export function QuestStageTracker({ job, firebaseToken, isHiredWorker, hasReviewed, onUpdated, footer }: QuestStageTrackerProps) {
  const { t } = useTranslation();
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completed = job.lifecycleStatus === "COMPLETED";
  const currentIndex = stageIndex(job);
  const next = job.lifecycleStatus === "IN_PROGRESS" ? NEXT_STAGE[job.workStage] : undefined;

  async function handleAdvance() {
    if (!next) return;
    setAdvancing(true);
    setError(null);
    try {
      const updated = await api.updateWorkStage(job.id, next.target, firebaseToken);
      onUpdated(updated);
    } catch (err) {
      setError(errorMessage(err, t("stageTracker.updateError")));
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <section aria-labelledby="stage-tracker-title" className="rounded-card border border-line bg-surface p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 id="stage-tracker-title" className="font-display text-h3 text-ink">
          {t("stageTracker.title")}
        </h2>
        {completed ? (
          hasReviewed ? (
            <StatusChip kind="job" value="COMPLETED" label={t("stageTracker.reviewed")} />
          ) : null
        ) : job.lifecycleStatus === "IN_PROGRESS" ? (
          <StatusChip kind="stage" value={job.workStage} />
        ) : null}
      </div>

      <ol className="flex flex-col md:flex-row">
        {STAGES.map((stage, i) => {
          const done = i < currentIndex || completed;
          const active = i === currentIndex && !completed;
          const Icon = stage.icon;
          const isLast = i === STAGES.length - 1;

          return (
            <li
              key={stage.key}
              aria-current={active ? "step" : undefined}
              className="relative flex gap-3 pb-6 last:pb-0 md:flex-1 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center"
            >
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 md:left-[calc(50%+1rem)] md:top-[15px] md:h-0.5 md:w-[calc(100%-2rem)]",
                    done ? "bg-primary" : "bg-line"
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  done ? "bg-primary text-on-fill" : active ? "bg-primary-soft text-primary ring-2 ring-primary" : "border border-line-strong bg-surface text-ink-subtle"
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className={cn("pt-1 text-label md:pt-0", done || active ? "text-ink" : "font-normal text-ink-subtle")}>
                {t(stage.labelKey)}
                <span className="sr-only">
                  {" "}
                  ({done ? t("stageTracker.stepDone") : active ? t("stageTracker.stepCurrent") : t("stageTracker.stepUpcoming")})
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {isHiredWorker && next ? (
        <div className="mt-6 space-y-2">
          <Button size="lg" className="w-full md:w-auto" onClick={handleAdvance} loading={advancing}>
            {advancing ? t("questTracker.updating") : t(next.ctaKey)}
          </Button>
          {error ? (
            <p role="alert" className="flex items-start gap-2 text-label font-normal text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {!isHiredWorker && job.lifecycleStatus === "IN_PROGRESS" && job.workStage === "AWAITING_REVIEW" ? (
        <p className="mt-6 rounded-control border-l-4 border-warning bg-warning-soft px-4 py-3 text-label font-normal text-ink">
          {t("questTracker.posterPrompt")}
        </p>
      ) : null}

      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}
