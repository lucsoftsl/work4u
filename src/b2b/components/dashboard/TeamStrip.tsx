"use client";

import { UsersRound } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Team, TeamStatus } from "@/b2b/api/types";
import { FAMILY_CLASSES, type Family } from "@/b2b/lib/status";
import { teamStatusLabel } from "@/b2b/lib/status-label";

const TEAM_FAMILY: Record<TeamStatus, Family> = {
  AVAILABLE: "green", ASSIGNED: "blue", TRAVELLING: "sky", ON_SITE: "sky", BREAK: "orange", OFFLINE: "slate",
};

export function TeamStrip({ teams, loading, failed, onRetry }: { teams?: Team[]; loading: boolean; failed: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  const active = teams?.filter((x) => x.active);
  return (
    <section aria-labelledby="teams-heading" className="rounded-lg border border-ops-border bg-ops-surface">
      <div className="border-b border-ops-border px-4 py-3">
        <h2 id="teams-heading" className="text-base font-bold text-ops-ink">{t("b2b.dashboard.teams", "Teams")}</h2>
      </div>
      <div className="min-h-[88px] p-3">
        {loading ? (
          <ul role="status" aria-busy="true" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <li className="sr-only">{t("b2b.common.loading", "Loading")}</li>
            {Array.from({ length: 4 }).map((_, i) => <li key={i} className="h-[52px] animate-pulse rounded bg-ops-border motion-reduce:animate-none" />)}
          </ul>
        ) : failed ? (
          <p className="text-sm text-ops-ink-muted">
            {t("b2b.dashboard.teamsError", "Teams could not be loaded.")}{" "}
            <button type="button" onClick={onRetry} className="min-h-[44px] font-bold text-ops-ink underline">{t("b2b.common.retry", "Retry")}</button>
          </p>
        ) : !active || active.length === 0 ? (
          <p className="text-sm text-ops-ink-muted">{t("b2b.dashboard.teamsEmpty", "No active teams yet.")}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {active.map((team) => (
              <li key={team.id} className="flex min-h-[52px] items-center justify-between gap-2 rounded border border-ops-border px-3">
                <span className="flex min-w-0 items-center gap-2">
                  <UsersRound className="h-4 w-4 shrink-0 text-ops-ink-subtle" aria-hidden="true" />
                  <span className="truncate text-sm font-bold text-ops-ink">{team.name}</span>
                </span>
                <span className={cn("inline-flex h-7 shrink-0 items-center rounded px-2 text-xs font-bold", FAMILY_CLASSES[TEAM_FAMILY[team.status]].tint)}>
                  {teamStatusLabel(t, team.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
