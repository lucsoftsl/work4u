"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabId = "overview" | "schedule" | "files" | "timeline";
export const TAB_IDS: readonly TabId[] = ["overview", "schedule", "files", "timeline"];
export const parseTab = (v: string | null): TabId => (TAB_IDS.includes(v as TabId) ? (v as TabId) : "overview");

export interface TabDef { id: TabId; label: string; count?: string | number }

/** Accessible tablist (roving tabindex, arrows/Home/End). Scrolls horizontally on narrow screens. */
export function JobTabs({ tabs, active, onChange, children }: { tabs: TabDef[]; active: TabId; onChange: (id: TabId) => void; children: ReactNode }) {
  const refs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === active);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const id = tabs[next].id;
    onChange(id);
    refs.current[id]?.focus();
  };
  return (
    <>
      <div role="tablist" aria-label="Job sections" onKeyDown={onKey} className="-mx-4 flex gap-1 overflow-x-auto border-b border-ops-border px-4 md:mx-0 md:px-0">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button key={t.id} ref={(el) => { refs.current[t.id] = el; }} role="tab" id={`tab-${t.id}`} type="button" aria-selected={on} aria-controls={`panel-${t.id}`} tabIndex={on ? 0 : -1}
              onClick={() => onChange(t.id)}
              className={cn("-mb-px inline-flex min-h-[44px] shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-accent",
                on ? "border-ops-ink text-ops-ink" : "border-transparent text-ops-ink-muted hover:text-ops-ink")}>
              {t.label}
              {t.count !== undefined ? <span className="rounded-full bg-ops-border px-2 text-xs text-ops-ink">{t.count}</span> : null}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} tabIndex={0} className="pt-4 focus-visible:outline-none">{children}</div>
    </>
  );
}
