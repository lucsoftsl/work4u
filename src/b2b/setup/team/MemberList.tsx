"use client";

import { usePersonName } from "@/b2b/lib/usePersonName";
import { Mail, Phone } from "lucide-react";
import { useTr } from "../i18n";
import type { Invitation, Member } from "../api";
import { deriveBadge } from "./memberLogic";
import { RowMenu, type RowAction } from "./RowMenu";
import { StatusBadge } from "./StatusBadge";

interface Props {
  members: Member[];
  invites: Record<string, Invitation>;
  canManage: boolean;
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onOpen: (m: Member) => void;
  onAction: (m: Member, a: RowAction) => void;
  /** Per-row permission (an Administrator row is read-only for a non-admin). */
  rowCanManage: (m: Member) => boolean;
}

function Contact({ m }: { m: Member }) {
  const { tr } = useTr();
  if (!m.workEmail && !m.phone) return <span className="text-ops-ink-muted">{tr("b2b.team.noContact", "No contact details")}</span>;
  return (
    <div className="space-y-0.5 text-sm">
      {m.workEmail && <p className="flex items-center gap-1.5 break-all"><Mail className="h-3.5 w-3.5 shrink-0 text-ops-ink-subtle" aria-hidden="true" />{m.workEmail}</p>}
      {m.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0 text-ops-ink-subtle" aria-hidden="true" />{m.phone}</p>}
    </div>
  );
}

function NameCell({ m, onOpen }: { m: Member; onOpen: (m: Member) => void }) {
  const { tr } = useTr();
  const nameOf = usePersonName();
  const type = m.memberType === "CONTRACTOR" ? tr("b2b.team.type.contractor", "Contractor") : tr("b2b.team.type.employee", "Employee");
  return (
    <div className="min-w-0">
      <button type="button" onClick={() => onOpen(m)} className="min-h-[44px] max-w-full text-left font-bold text-ops-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2">
        <span className="break-words">{nameOf(m.displayName)}</span>
      </button>
      <p className="-mt-2 text-xs text-ops-ink-muted">{type}{m.externalId ? ` · ${m.externalId}` : ""}</p>
    </div>
  );
}

function Check({ m, selected, onToggle }: { m: Member; selected: boolean; onToggle: (id: string) => void }) {
  const { tr } = useTr();
  const nameOf = usePersonName();
  return (
    <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center">
      <input type="checkbox" checked={selected} onChange={() => onToggle(m.id)} aria-label={tr("b2b.team.select", "Select {name}", { name: nameOf(m.displayName) })} className="h-5 w-5" />
    </label>
  );
}

/** Table at >= 900px (Contact hidden at 768 by container width), labelled cards below 900. */
export function MemberList({ members, invites, canManage, selected, onToggle, onOpen, onAction, rowCanManage }: Props) {
  const { tr } = useTr();
  const th = "px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-ops-ink-muted";
  return (
    <>
      <div className="relative hidden min-[1280px]:block overflow-x-auto rounded-lg border border-ops-border bg-ops-surface">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{tr("b2b.team.title", "Team & employees")}</caption>
          <thead className="border-b border-ops-border"><tr>
            {canManage && <th scope="col" className={`${th} w-12`}><span className="sr-only">{tr("b2b.team.selectCol", "Select")}</span></th>}
            <th scope="col" className={th}>{tr("b2b.team.col.name", "Name")}</th>
            <th scope="col" className={th}>{tr("b2b.team.col.role", "Role")}</th>
            <th scope="col" className={th}>{tr("b2b.team.col.contact", "Contact")}</th>
            <th scope="col" className={th}>{tr("b2b.team.col.status", "Status")}</th>
            {canManage && <th scope="col" className={`${th} w-14`}><span className="sr-only">{tr("b2b.team.col.actions", "Actions")}</span></th>}
          </tr></thead>
          <tbody className="divide-y divide-ops-border">
            {members.map((m) => (
              <tr key={m.id} className="align-top">
                {canManage && <td className="px-1 py-1">{rowCanManage(m) ? <Check m={m} selected={selected.has(m.id)} onToggle={onToggle} /> : null}</td>}
                <td className="px-3 py-1"><NameCell m={m} onOpen={onOpen} /></td>
                <td className="px-3 py-3">{m.role.name}</td>
                <td className="px-3 py-3"><Contact m={m} /></td>
                <td className="px-3 py-3"><StatusBadge badge={deriveBadge(m)} invitedAt={invites[m.id]?.createdAt} /></td>
                {canManage && <td className="px-1 py-1"><RowMenu member={m} canManage={rowCanManage(m)} onAction={(a) => onAction(m, a)} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 min-[1280px]:hidden">
        {members.map((m) => (
          <li key={m.id} className="rounded-lg border border-ops-border bg-ops-surface p-3">
            <div className="flex items-start gap-1">
              {canManage && rowCanManage(m) && <Check m={m} selected={selected.has(m.id)} onToggle={onToggle} />}
              <div className="min-w-0 flex-1"><NameCell m={m} onOpen={onOpen} /></div>
              <RowMenu member={m} canManage={rowCanManage(m)} onAction={(a) => onAction(m, a)} />
            </div>
            <dl className="mt-1 space-y-2 text-sm">
              <div><dt className="text-xs font-bold text-ops-ink-muted">{tr("b2b.team.col.role", "Role")}</dt><dd>{m.role.name}</dd></div>
              <div><dt className="text-xs font-bold text-ops-ink-muted">{tr("b2b.team.col.contact", "Contact")}</dt><dd><Contact m={m} /></dd></div>
              <div><dt className="sr-only">{tr("b2b.team.col.status", "Status")}</dt><dd><StatusBadge badge={deriveBadge(m)} invitedAt={invites[m.id]?.createdAt} /></dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
