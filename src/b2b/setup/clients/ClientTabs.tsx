"use client";

import { useRef } from "react";
import { useTr } from "@/b2b/setup/i18n";
import { TAB_ORDER, nextTab, type ClientTabId } from "./tabs";

interface Props { active: ClientTabId; onChange: (t: ClientTabId) => void; counts: { addresses?: number; jobs?: number }; enabled: readonly ClientTabId[] }

export const tabDomId = (t: ClientTabId) => `client-tab-${t}`;
export const panelDomId = (t: ClientTabId) => `client-panel-${t}`;

/** Real tablist: roving tabindex, arrow keys / Home / End; scrolls sideways on phones, never truncates. Files is disabled ("Soon"). */
export function ClientTabs({ active, onChange, counts, enabled }: Props) {
  const { tr } = useTr();
  const refs = useRef<Partial<Record<ClientTabId, HTMLButtonElement | null>>>({});
  const label = (t: ClientTabId): string => {
    const n = (v?: number) => (v === undefined ? "" : ` (${v})`);
    switch (t) {
      case "overview": return tr("b2b.clients.tab.overview", "Overview");
      case "addresses": return `${tr("b2b.clients.tab.addresses", "Addresses")}${n(counts.addresses)}`;
      case "jobs": return `${tr("b2b.clients.tab.jobs", "Job history")}${n(counts.jobs)}`;
      case "notes": return tr("b2b.clients.tab.notes", "Notes");
      default: return tr("b2b.clients.tab.files", "Files");
    }
  };
  return (
    <div className="overflow-x-auto border-b border-ops-border">
      <div role="tablist" aria-label={tr("b2b.clients.tabs", "Client sections")} className="flex min-w-max gap-1"
        onKeyDown={(e) => {
          const next = nextTab(active, e.key, enabled);
          if (!next) return;
          e.preventDefault();
          onChange(next);
          refs.current[next]?.focus();
        }}>
        {TAB_ORDER.map((t) => {
          const on = enabled.includes(t);
          const selected = t === active;
          return (
            <button key={t} ref={(el) => { refs.current[t] = el; }} id={tabDomId(t)} type="button" role="tab" aria-selected={selected} aria-controls={panelDomId(t)}
              aria-disabled={!on || undefined} disabled={!on} tabIndex={selected ? 0 : -1} onClick={() => on && onChange(t)}
              className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ${selected ? "border-ops-ink text-ops-ink" : "border-transparent text-ops-ink-muted hover:text-ops-ink"} disabled:cursor-not-allowed disabled:opacity-60`}>
              {label(t)}
              {t === "files" && <span className="rounded border border-dashed border-ops-border-strong px-1.5 text-xs">{tr("b2b.clients.soon", "Soon")}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
