"use client";

import { useState } from "react";
import { ScrollText, CheckCircle2, Navigation, Hammer, ClipboardCheck, PartyPopper, Star } from "lucide-react";
import { api } from "@/lib/api";
import type { Job, JobWorkStage } from "@/api/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface QuestStageTrackerProps {
  job: Job;
  firebaseToken: string;
  isHiredWorker: boolean;
  hasReviewed: boolean;
  onUpdated: (job: Job) => void;
}

function stageIndex(stages: { key: string }[], job: Job): number {
  if (job.lifecycleStatus === "COMPLETED") return stages.length - 1;
  return stages.findIndex((s) => s.key === job.workStage);
}

export function QuestStageTracker({ job, firebaseToken, isHiredWorker, hasReviewed, onUpdated }: QuestStageTrackerProps) {
  const { t } = useTranslation();
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STAGES: { key: JobWorkStage | "COMPLETED"; label: string; icon: typeof ScrollText }[] = [
    { key: "HIRED", label: t("questTracker.stage.hired", "Quest Accepted"), icon: ScrollText },
    { key: "EN_ROUTE", label: t("questTracker.stage.enRoute", "On My Way"), icon: Navigation },
    { key: "STARTED", label: t("questTracker.stage.started", "Working On It"), icon: Hammer },
    { key: "AWAITING_REVIEW", label: t("questTracker.stage.awaitingReview", "Awaiting Review"), icon: ClipboardCheck },
    { key: "COMPLETED", label: t("questTracker.stage.completed", "Quest Complete"), icon: PartyPopper },
  ];

  const NEXT_STAGE: Partial<Record<JobWorkStage, { target: "EN_ROUTE" | "STARTED" | "AWAITING_REVIEW"; cta: string }>> = {
    HIRED: { target: "EN_ROUTE", cta: t("questTracker.cta.enRoute", "I'm on my way") },
    EN_ROUTE: { target: "STARTED", cta: t("questTracker.cta.started", "I've arrived, starting now") },
    STARTED: { target: "AWAITING_REVIEW", cta: t("questTracker.cta.awaitingReview", "Mark job as done") },
  };

  const currentIndex = stageIndex(STAGES, job);
  const next = job.lifecycleStatus === "IN_PROGRESS" ? NEXT_STAGE[job.workStage] : undefined;

  async function handleAdvance() {
    if (!next) return;
    setAdvancing(true);
    setError(null);
    try {
      const updated = await api.updateWorkStage(job.id, next.target, firebaseToken);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update job stage");
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-outline bg-card p-6">
      <div className="mb-5 flex items-center gap-2">
        <ScrollText size={18} className="text-brand" />
        <h3 className="text-sm font-bold text-ink">{t("questTracker.title", "Job Quest")}</h3>
      </div>

      <ol className="space-y-0">
        {STAGES.map((stage, i) => {
          const done = i < currentIndex || job.lifecycleStatus === "COMPLETED";
          const active = i === currentIndex && job.lifecycleStatus !== "COMPLETED";
          const Icon = stage.icon;
          const isLast = i === STAGES.length - 1;

          return (
            <li key={stage.key} className="relative flex gap-3 pb-6 last:pb-0">
              {!isLast && (
                <span
                  className={cn(
                    "absolute left-[15px] top-8 h-full w-0.5",
                    done ? "bg-brand" : "bg-outline"
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  done
                    ? "bg-brand text-white"
                    : active
                      ? "bg-brand-soft text-brand ring-2 ring-brand"
                      : "bg-muted text-ink-subtle"
                )}
              >
                {done ? <CheckCircle2 size={16} /> : <Icon size={15} />}
              </span>
              <div className="pt-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    done || active ? "text-ink" : "text-ink-subtle"
                  )}
                >
                  {stage.label}
                </p>
                {stage.key === "COMPLETED" && job.lifecycleStatus === "COMPLETED" && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                      <Star size={11} className="fill-amber-500 text-amber-500" />
                      {t("questTracker.rewardEarned", "Reward earned")}
                    </span>
                    {hasReviewed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 font-semibold text-green-700">
                        <CheckCircle2 size={11} />
                        {t("questTracker.reviewedClosed", "Reviewed · Quest Closed")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {isHiredWorker && next && (
        <div className="mt-2">
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className="w-full rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-brand-strong disabled:opacity-60"
          >
            {advancing ? t("questTracker.updating", "Updating...") : next.cta}
          </button>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}

      {!isHiredWorker && job.lifecycleStatus === "IN_PROGRESS" && job.workStage === "AWAITING_REVIEW" && (
        <div className="mt-2 rounded-xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand">
          {t("questTracker.posterPrompt", "The worker says the job is done — review the work and mark it complete below.")}
        </div>
      )}
    </div>
  );
}
