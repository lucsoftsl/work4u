"use client";

import { usePersonName } from "@/b2b/lib/usePersonName";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTr } from "../i18n";
import type { Member } from "../api";

export type RowAction = "edit" | "invite" | "suspend" | "reactivate" | "remove";

/** Row menu (disclosure with action buttons). Esc and outside click close it; focus returns to the trigger. */
export function RowMenu({ member, canManage, onAction }: { member: Member; canManage: boolean; onAction: (a: RowAction) => void }) {
  const { tr } = useTr();
  const nameOf = usePersonName();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  if (!canManage) return null;
  const item = "flex min-h-[44px] w-full items-center px-3 text-left text-sm font-bold text-ops-ink hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2";
  // Move focus to the (persistent) trigger before the menu item unmounts, so a dialog opened by the action records the trigger as its
  // opener and returns focus there when it closes (instead of the page start).
  const run = (a: RowAction) => { trigger.current?.focus(); setOpen(false); onAction(a); };
  const suspended = member.status === "SUSPENDED";
  return (
    <div ref={wrap} className="relative">
      <button ref={trigger} type="button" aria-expanded={open} aria-haspopup="true" aria-label={tr("b2b.team.menu", "Actions for {name}", { name: nameOf(member.displayName) })} onClick={() => setOpen((o) => !o)} className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2">
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <ul className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded border border-ops-border-strong bg-ops-surface shadow-lg">
          <li><button type="button" className={item} onClick={() => run("edit")}>{tr("b2b.team.edit", "Edit")}</button></li>
          {!suspended && member.loginStatus !== "ACTIVE" && (
            <li><button type="button" className={item} onClick={() => run("invite")}>{member.loginStatus === "INVITED" ? tr("b2b.team.invite.resend", "Resend invitation") : tr("b2b.team.invite.menu", "Invite to the app")}</button></li>
          )}
          <li><button type="button" className={item} onClick={() => run(suspended ? "reactivate" : "suspend")}>{suspended ? tr("b2b.team.reactivate", "Reactivate") : tr("b2b.team.suspend", "Suspend")}</button></li>
          <li><button type="button" className={`${item} text-sig-vermilion-ink`} onClick={() => run("remove")}>{tr("b2b.team.remove", "Remove")}</button></li>
        </ul>
      )}
    </div>
  );
}
