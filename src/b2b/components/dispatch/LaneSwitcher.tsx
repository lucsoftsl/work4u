"use client";

import { useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { DispatchBoard } from "@/b2b/api/types";
import { INDIVIDUALS_LANE, laneTabs, nextTab } from "@/b2b/lib/dispatch-view";
import { UNASSIGNED_LANE } from "@/b2b/lib/dispatch";

interface Props { board: DispatchBoard; active: string; onSelect: (laneId: string) => void }

export const laneTabId = (id: string) => `lane-tab-${id}`;

/** Tablet-only (md..lg) segmented control: one lane visible at a time. Roving tabindex + arrow keys. */
export function LaneSwitcher({ board, active, onSelect }: Props) {
  const { t } = useTranslation();
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const tabs = laneTabs(board);
  const count = (id: string): number =>
    id === UNASSIGNED_LANE ? board.unassigned.length : id === INDIVIDUALS_LANE ? board.individuals.length : (board.teams.find((x) => x.id === id)?.jobs.length ?? 0);
  const label = (id: string): string =>
    id === UNASSIGNED_LANE ? t("b2b.dispatch.unassigned", "Unassigned") : id === INDIVIDUALS_LANE ? t("b2b.dispatch.individuals", "Individuals") : (board.teams.find((x) => x.id === id)?.name ?? id);

  return (
    <div
      role="tablist"
      aria-label={t("b2b.dispatch.lanes", "Teams")}
      className="hidden gap-1 overflow-x-auto md:flex lg:hidden"
      onKeyDown={(e) => {
        const next = nextTab(active, tabs, e.key);
        if (!next) return;
        e.preventDefault();
        onSelect(next);
        refs.current.get(next)?.focus();
      }}
    >
      {tabs.map((id) => {
        const on = id === active;
        return (
          <button
            key={id}
            ref={(el) => { if (el) refs.current.set(id, el); else refs.current.delete(id); }}
            id={laneTabId(id)}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(id)}
            className={cn(
              "inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded border px-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-ink",
              on ? "border-ops-ink bg-ops-ink text-white" : "border-ops-border-strong bg-ops-surface text-ops-ink hover:bg-ops-canvas"
            )}
          >
            {label(id)}
            <span className={cn("font-mono text-xs", on ? "text-white/80" : "text-ops-ink-muted")}>{count(id)}</span>
          </button>
        );
      })}
    </div>
  );
}
