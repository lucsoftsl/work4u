"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useTr } from "@/b2b/setup/i18n";

interface Props {
  name: string; archived: boolean; canManage: boolean; canCreateJob: boolean; jobHref: string; offline: boolean;
  onEdit: () => void; onToggleArchive: () => void;
}

const ITEM = "flex min-h-[44px] w-full items-center px-4 text-left text-sm font-bold text-ops-ink hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:opacity-50";

/** Disclosure menu: Edit, New job, Archive/Restore. Esc and outside click close it and focus returns to the trigger. */
export function RowMenu({ name, archived, canManage, canCreateJob, jobHref, offline, onEdit, onToggleArchive }: Props) {
  const { tr } = useTr();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!canManage && !(canCreateJob && !archived)) return null;
  const run = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <div ref={root} className="relative inline-block">
      <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        aria-label={tr("b2b.clients.menu", "Actions for {name}", { name })} onClick={() => setOpen((o) => !o)}
        className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2">
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div id={id} role="menu" className="absolute right-0 z-20 mt-1 w-52 rounded border border-ops-border-strong bg-ops-surface py-1 shadow-lg">
          {canManage && <button type="button" role="menuitem" disabled={offline} onClick={run(onEdit)} className={ITEM}>{tr("b2b.common.edit", "Edit")}</button>}
          {canCreateJob && !archived && <Link role="menuitem" href={jobHref} className={ITEM}>{tr("b2b.clients.newJob", "New job")}</Link>}
          {canManage && <button type="button" role="menuitem" disabled={offline} onClick={run(onToggleArchive)} className={ITEM}>{archived ? tr("b2b.clients.restore", "Restore") : tr("b2b.clients.archive", "Archive")}</button>}
        </div>
      )}
    </div>
  );
}
