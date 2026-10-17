"use client";

import Link from "next/link";
import { useTr } from "@/b2b/setup/i18n";
import type { Client } from "@/b2b/setup/api";
import { useMediaQuery } from "@/b2b/lib/useMediaQuery";
import { TagChips, shortDate, typeLabel } from "./parts";
import { RowMenu } from "./RowMenu";

interface Props {
  items: Client[]; base: string; jobsNewHref: string; canManage: boolean; canCreateJob: boolean; offline: boolean;
  onEdit: (c: Client) => void; onToggleArchive: (c: Client) => void;
}

export function ClientsList(p: Props) {
  const { tr } = useTr();
  const cards = !useMediaQuery("(min-width: 600px)");
  const showAdded = useMediaQuery("(min-width: 900px)");
  const none = tr("b2b.clients.noContact", "No contact details");
  const link = (c: Client) => `${p.base}/${encodeURIComponent(c.id)}`;
  const menu = (c: Client) => (
    <RowMenu name={c.name} archived={!!c.archivedAt} canManage={p.canManage} canCreateJob={p.canCreateJob} jobHref={p.jobsNewHref} offline={p.offline}
      onEdit={() => p.onEdit(c)} onToggleArchive={() => p.onToggleArchive(c)} />
  );
  const sub = (c: Client) => [typeLabel(c.type, tr), c.externalId ? tr("b2b.clients.idLabel", "ID {id}", { id: c.externalId }) : ""].filter(Boolean).join(" · ");
  const archivedBadge = (c: Client) => c.archivedAt && <span className="ml-2 rounded border border-ops-border-strong px-1.5 py-0.5 text-xs font-bold text-ops-ink-muted">{tr("b2b.clients.archivedBadge", "Archived")}</span>;

  if (cards) {
    return (
      <ul className="space-y-2">
        {p.items.map((c) => (
          <li key={c.id} className="rounded-lg border border-ops-border bg-ops-surface p-3">
            <div className="flex items-start justify-between gap-2">
              <Link href={link(c)} className="min-h-[44px] min-w-0 flex-1 focus-visible:outline focus-visible:outline-2">
                <span className="block break-words font-bold text-ops-ink">{c.name}{archivedBadge(c)}</span>
                <span className="block text-xs text-ops-ink-muted">{sub(c)}</span>
              </Link>
              {menu(c)}
            </div>
            <p className="mt-1 break-words text-sm text-ops-ink">{[c.email, c.phone].filter(Boolean).join(" · ") || none}</p>
            <div className="mt-2"><TagChips tags={c.tags} /></div>
          </li>
        ))}
      </ul>
    );
  }
  const th = "px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-ops-ink-muted";
  return (
    <div className="overflow-x-auto rounded-lg border border-ops-border bg-ops-surface">
      <table className="w-full border-collapse">
        <caption className="sr-only">{tr("b2b.clients.title", "Clients")}</caption>
        <thead className="border-b border-ops-border">
          <tr>
            <th scope="col" className={th}>{tr("b2b.clients.col.client", "Client")}</th>
            <th scope="col" className={th}>{tr("b2b.clients.col.contact", "Contact")}</th>
            <th scope="col" className={th}>{tr("b2b.clients.tags", "Tags")}</th>
            {showAdded && <th scope="col" className={th}>{tr("b2b.clients.col.added", "Added")}</th>}
            <td className={th}><span className="sr-only">{tr("b2b.clients.col.actions", "Actions")}</span></td>
          </tr>
        </thead>
        <tbody className="divide-y divide-ops-border">
          {p.items.map((c) => (
            <tr key={c.id} className="align-top">
              <th scope="row" className="px-4 py-3 text-left font-normal">
                <Link href={link(c)} className="font-bold text-ops-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2">{c.name}</Link>{archivedBadge(c)}
                <span className="block text-xs text-ops-ink-muted">{sub(c)}</span>
              </th>
              <td className="px-4 py-3 text-sm text-ops-ink">
                {c.email || c.phone ? <>{c.email && <span className="block break-all">{c.email}</span>}{c.phone && <span className="block">{c.phone}</span>}</> : <span className="text-ops-ink-muted">{none}</span>}
              </td>
              <td className="px-4 py-3"><TagChips tags={c.tags} /></td>
              {showAdded && <td className="px-4 py-3 text-sm text-ops-ink">{shortDate(c.createdAt)}</td>}
              <td className="px-2 py-1 text-right">{menu(c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
